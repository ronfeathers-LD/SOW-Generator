-- Production Migration: Fix PM Hours Removal Schema
-- This migration adds the missing columns that the codebase expects for the PM Hours Removal feature
-- Safe to run multiple times with IF NOT EXISTS clauses

-- 1. Add missing columns to pm_hours_removal_requests table
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS pm_director_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS current_pm_hours INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS requested_pm_hours INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS hours_to_remove INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS approval_comments TEXT;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS financial_impact DECIMAL(10,2);

-- 2. Add missing columns to pm_hours_removal_comments table
-- First, rename pm_hours_comments to pm_hours_removal_comments if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_hours_comments') THEN
        ALTER TABLE pm_hours_comments RENAME TO pm_hours_removal_comments;
    END IF;
END $$;

-- Now add the missing columns
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES pm_hours_removal_comments(id) ON DELETE CASCADE;
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- 3. Add PM hours removal columns to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removed INTEGER DEFAULT 0;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_approved BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_requester_id UUID REFERENCES users(id);
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_approver_id UUID REFERENCES users(id);

-- 4. Create the audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS pm_hours_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  request_id UUID REFERENCES pm_hours_removal_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_pm_hours INTEGER,
  new_pm_hours INTEGER,
  comments TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 5. Enable RLS on audit log table
ALTER TABLE pm_hours_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for audit log
DROP POLICY IF EXISTS "Users can manage pm hours audit log" ON pm_hours_audit_log;
CREATE POLICY "Users can manage pm hours audit log" ON pm_hours_audit_log FOR ALL USING (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_pm_director_id ON pm_hours_removal_requests(pm_director_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_current_pm_hours ON pm_hours_removal_requests(current_pm_hours);
CREATE INDEX IF NOT EXISTS idx_sows_pm_hours_requirement_disabled ON sows(pm_hours_requirement_disabled);
CREATE INDEX IF NOT EXISTS idx_sows_pm_hours_removal_approved ON sows(pm_hours_removal_approved);
CREATE INDEX IF NOT EXISTS idx_pm_hours_audit_log_sow_id ON pm_hours_audit_log(sow_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_audit_log_request_id ON pm_hours_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_audit_log_user_id ON pm_hours_audit_log(user_id);

-- 8. Create trigger for pm_hours_removal_comments updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_hours_removal_comments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_hours_removal_comments_updated_at') THEN
            CREATE TRIGGER update_pm_hours_removal_comments_updated_at 
              BEFORE UPDATE ON pm_hours_removal_comments 
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;
