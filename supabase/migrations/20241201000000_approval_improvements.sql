-- Migration: Approval System Improvements
-- Date: 2024-12-01
-- Description: Add constraints, indexes, and audit trail improvements

-- 1. Add constraints to prevent invalid approval states
ALTER TABLE sow_approvals 
ADD CONSTRAINT check_approval_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'skipped'));

-- 2. Add constraint to ensure only one approval per stage per SOW
ALTER TABLE sow_approvals 
ADD CONSTRAINT unique_sow_stage 
UNIQUE (sow_id, stage_id);

-- 3. Add constraint to ensure valid user roles
ALTER TABLE users 
ADD CONSTRAINT check_user_role 
CHECK (role IN ('user', 'manager', 'director', 'vp', 'admin'));

-- 4. Add constraint to ensure valid stage roles
ALTER TABLE approval_stages 
ADD CONSTRAINT check_stage_role 
CHECK (assigned_role IS NULL OR assigned_role IN ('manager', 'director', 'vp'));

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sow_approvals_sow_id ON sow_approvals(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_approvals_stage_id ON sow_approvals(stage_id);
CREATE INDEX IF NOT EXISTS idx_sow_approvals_status ON sow_approvals(status);
CREATE INDEX IF NOT EXISTS idx_sow_approvals_approver_id ON sow_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_sow_id ON approval_comments(sow_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_user_id ON approval_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_parent_id ON approval_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_approval_stages_sort_order ON approval_stages(sort_order);
CREATE INDEX IF NOT EXISTS idx_approval_stages_active ON approval_stages(is_active);

-- 6. Create audit trail table for approval actions
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  approval_id UUID REFERENCES sow_approvals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'approve', 'reject', 'skip', 'comment_added', 'workflow_started'
  previous_status TEXT,
  new_status TEXT,
  comments TEXT,
  metadata JSONB, -- Additional context like IP, user agent, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_sow_id ON approval_audit_log(sow_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_approval_id ON approval_audit_log(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_user_id ON approval_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_action ON approval_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_created_at ON approval_audit_log(created_at);

-- 8. Create function to automatically log approval changes
CREATE OR REPLACE FUNCTION log_approval_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the change to audit trail
  INSERT INTO approval_audit_log (
    sow_id,
    approval_id,
    user_id,
    action,
    previous_status,
    new_status,
    comments,
    metadata
  ) VALUES (
    NEW.sow_id,
    NEW.id,
    NEW.approver_id,
    CASE 
      WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN 'approve'
      WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN 'reject'
      WHEN OLD.status = 'pending' AND NEW.status = 'skipped' THEN 'skip'
      ELSE 'status_change'
    END,
    OLD.status,
    NEW.status,
    NEW.comments,
    jsonb_build_object(
      'approved_at', NEW.approved_at,
      'rejected_at', NEW.rejected_at,
      'skipped_at', NEW.skipped_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically log approval changes
DROP TRIGGER IF EXISTS trigger_log_approval_change ON sow_approvals;
CREATE TRIGGER trigger_log_approval_change
  AFTER UPDATE ON sow_approvals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_approval_change();

-- 10. Create function to log workflow start
CREATE OR REPLACE FUNCTION log_workflow_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Log workflow start to audit trail
  INSERT INTO approval_audit_log (
    sow_id,
    approval_id,
    action,
    new_status,
    metadata
  ) VALUES (
    NEW.sow_id,
    NEW.id,
    'workflow_started',
    'pending',
    jsonb_build_object('stage_id', NEW.stage_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to log workflow start
DROP TRIGGER IF EXISTS trigger_log_workflow_start ON sow_approvals;
CREATE TRIGGER trigger_log_workflow_start
  AFTER INSERT ON sow_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_workflow_start();

-- 12. Add function to get approval statistics
CREATE OR REPLACE FUNCTION get_approval_stats(sow_id_param UUID)
RETURNS TABLE (
  total_approvals INTEGER,
  pending_approvals INTEGER,
  approved_approvals INTEGER,
  rejected_approvals INTEGER,
  skipped_approvals INTEGER,
  workflow_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_approvals,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_approvals,
    COUNT(*) FILTER (WHERE status = 'approved')::INTEGER as approved_approvals,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER as rejected_approvals,
    COUNT(*) FILTER (WHERE status = 'skipped')::INTEGER as skipped_approvals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'rejected') > 0 THEN 'rejected'
      WHEN COUNT(*) FILTER (WHERE status = 'pending') = 0 THEN 'approved'
      ELSE 'pending'
    END as workflow_status
  FROM sow_approvals 
  WHERE sow_id = sow_id_param;
END;
$$ LANGUAGE plpgsql;

-- 13. Add function to validate approval workflow
CREATE OR REPLACE FUNCTION validate_approval_workflow(sow_id_param UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  vp_approved BOOLEAN;
  director_approved BOOLEAN;
  manager_approved BOOLEAN;
BEGIN
  -- Check if VP has approved (bypasses all others)
  SELECT EXISTS(
    SELECT 1 FROM sow_approvals sa
    JOIN approval_stages ast ON sa.stage_id = ast.id
    WHERE sa.sow_id = sow_id_param 
    AND ast.name = 'VP Approval' 
    AND sa.status = 'approved'
  ) INTO vp_approved;
  
  -- Check if Director has approved
  SELECT EXISTS(
    SELECT 1 FROM sow_approvals sa
    JOIN approval_stages ast ON sa.stage_id = ast.id
    WHERE sa.sow_id = sow_id_param 
    AND ast.name = 'Director Approval' 
    AND sa.status = 'approved'
  ) INTO director_approved;
  
  -- Check if Manager has approved
  SELECT EXISTS(
    SELECT 1 FROM sow_approvals sa
    JOIN approval_stages ast ON sa.stage_id = ast.id
    WHERE sa.sow_id = sow_id_param 
    AND ast.name = 'Manager Approval' 
    AND sa.status = 'approved'
  ) INTO manager_approved;
  
  -- Validate workflow logic
  IF vp_approved THEN
    -- VP approval bypasses all others - this is valid
    RETURN QUERY SELECT TRUE, 'VP approval bypasses all others'::TEXT;
  ELSIF director_approved AND NOT manager_approved THEN
    -- Director approved without Manager - this is invalid
    RETURN QUERY SELECT FALSE, 'Director cannot approve before Manager'::TEXT;
  ELSE
    -- Normal flow or VP approved - this is valid
    RETURN QUERY SELECT TRUE, 'Workflow is valid'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 14. Add RLS policies for better security
ALTER TABLE sow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for sow_approvals - users can only see approvals for SOWs they have access to
CREATE POLICY "Users can view approvals for accessible SOWs" ON sow_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sows s
      WHERE s.id = sow_approvals.sow_id
      AND (s.created_by = auth.uid() OR s.status = 'public')
    )
  );

-- Policy for approval_audit_log - users can only see audit logs for SOWs they have access to
CREATE POLICY "Users can view audit logs for accessible SOWs" ON approval_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sows s
      WHERE s.id = approval_audit_log.sow_id
      AND (s.created_by = auth.uid() OR s.status = 'public')
    )
  );

-- 15. Add comments for documentation
COMMENT ON TABLE approval_audit_log IS 'Audit trail for all approval-related actions';
COMMENT ON COLUMN approval_audit_log.action IS 'Type of action performed: approve, reject, skip, comment_added, workflow_started';
COMMENT ON COLUMN approval_audit_log.metadata IS 'Additional context like timestamps, IP addresses, etc.';
COMMENT ON FUNCTION get_approval_stats(UUID) IS 'Get approval statistics for a SOW';
COMMENT ON FUNCTION validate_approval_workflow(UUID) IS 'Validate that approval workflow follows business rules';
