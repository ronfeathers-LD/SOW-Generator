-- Add PM Hours Removal Approval System
-- This migration adds the necessary tables and fields for PM hours removal requests

-- Add pm_director role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pm_director BOOLEAN DEFAULT false;

-- Create PM hours removal requests table
CREATE TABLE IF NOT EXISTS pm_hours_removal_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pm_director_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_pm_hours INTEGER NOT NULL,
  requested_pm_hours INTEGER NOT NULL,
  hours_to_remove INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  approval_comments TEXT,
  rejection_reason TEXT,
  financial_impact DECIMAL(10,2) GENERATED ALWAYS AS (hours_to_remove * 250) STORED -- Assuming $250/hour PM rate
);

-- Create audit log for PM hours changes
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

-- Create threaded comments for PM hours removal requests
CREATE TABLE IF NOT EXISTS pm_hours_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_id UUID REFERENCES pm_hours_removal_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  parent_id UUID REFERENCES pm_hours_comments(id) ON DELETE CASCADE,
  is_internal BOOLEAN DEFAULT false
);

-- Add PM hours removal tracking to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removed INTEGER DEFAULT 0;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_approved BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_date TIMESTAMP WITH TIME ZONE;

-- Add toggle to disable PM hours requirement entirely
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_requester_id UUID REFERENCES users(id);
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_approver_id UUID REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_sow_id ON pm_hours_removal_requests(sow_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_status ON pm_hours_removal_requests(status);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_pm_director_id ON pm_hours_removal_requests(pm_director_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_requester_id ON pm_hours_removal_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_audit_log_sow_id ON pm_hours_audit_log(sow_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_audit_log_request_id ON pm_hours_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_comments_request_id ON pm_hours_comments(request_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_hours_removal_requests_updated_at') THEN
        CREATE TRIGGER update_pm_hours_removal_requests_updated_at 
          BEFORE UPDATE ON pm_hours_removal_requests 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_hours_comments_updated_at') THEN
        CREATE TRIGGER update_pm_hours_comments_updated_at 
          BEFORE UPDATE ON pm_hours_comments 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE pm_hours_removal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pm_hours_removal_requests (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'Users can view their own requests') THEN
        CREATE POLICY "Users can view their own requests" ON pm_hours_removal_requests
          FOR SELECT USING (auth.uid() = requester_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'PM Directors can view all requests') THEN
        CREATE POLICY "PM Directors can view all requests" ON pm_hours_removal_requests
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.pm_director = true
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'Admins can view all requests') THEN
        CREATE POLICY "Admins can view all requests" ON pm_hours_removal_requests
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'Users can create requests for SOWs they have access to') THEN
        CREATE POLICY "Users can create requests for SOWs they have access to" ON pm_hours_removal_requests
          FOR INSERT WITH CHECK (
            auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM sows 
              WHERE sows.id = sow_id 
              AND sows.status = 'draft'
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'PM Directors can update requests') THEN
        CREATE POLICY "PM Directors can update requests" ON pm_hours_removal_requests
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.pm_director = true
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_removal_requests' AND policyname = 'Admins can update requests') THEN
        CREATE POLICY "Admins can update requests" ON pm_hours_removal_requests
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
END $$;

-- Create RLS policies for pm_hours_audit_log (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_audit_log' AND policyname = 'Users can view audit logs for SOWs they have access to') THEN
        CREATE POLICY "Users can view audit logs for SOWs they have access to" ON pm_hours_audit_log
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM sows 
              WHERE sows.id = sow_id 
              AND sows.author_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_audit_log' AND policyname = 'PM Directors can view all audit logs') THEN
        CREATE POLICY "PM Directors can view all audit logs" ON pm_hours_audit_log
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.pm_director = true
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_audit_log' AND policyname = 'Admins can view all audit logs') THEN
        CREATE POLICY "Admins can view all audit logs" ON pm_hours_audit_log
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
END $$;

-- Create RLS policies for pm_hours_comments (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_comments' AND policyname = 'Users can view comments for requests they have access to') THEN
        CREATE POLICY "Users can view comments for requests they have access to" ON pm_hours_comments
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM pm_hours_removal_requests 
              WHERE pm_hours_removal_requests.id = request_id 
              AND (
                pm_hours_removal_requests.requester_id = auth.uid() 
                OR EXISTS (
                  SELECT 1 FROM users 
                  WHERE users.id = auth.uid() 
                  AND users.pm_director = true
                )
                OR EXISTS (
                  SELECT 1 FROM users 
                  WHERE users.id = auth.uid() 
                  AND users.role = 'admin'
                )
              )
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_hours_comments' AND policyname = 'Users can create comments for requests they have access to') THEN
        CREATE POLICY "Users can create comments for requests they have access to" ON pm_hours_comments
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM pm_hours_removal_requests 
              WHERE pm_hours_removal_requests.id = request_id 
              AND (
                pm_hours_removal_requests.requester_id = auth.uid() 
                OR EXISTS (
                  SELECT 1 FROM users 
                  WHERE users.id = auth.uid() 
                  AND users.pm_director = true
                )
                OR EXISTS (
                  SELECT 1 FROM users 
                  WHERE users.id = auth.uid() 
                  AND users.role = 'admin'
                )
              )
            )
          );
    END IF;
END $$;

-- Insert some sample PM Directors (you'll need to update these with actual user IDs)
-- UPDATE users SET pm_director = true WHERE email IN ('pm.director@company.com', 'another.pm.director@company.com');

-- Create a view for PM hours requirement disable dashboard (will replace if exists)
CREATE OR REPLACE VIEW pm_hours_removal_dashboard AS
SELECT 
  r.id as request_id,
  r.created_at,
  r.updated_at,
  r.status,
  r.current_pm_hours,
  r.hours_to_remove,
  r.reason,
  r.financial_impact,
  s.id as sow_id,
  s.sow_title,
  s.client_name,
  s.status as sow_status,
  requester.name as requester_name,
  requester.email as requester_email,
  pm_director.name as pm_director_name,
  pm_director.email as pm_director_email,
  EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_since_request
FROM pm_hours_removal_requests r
JOIN sows s ON r.sow_id = s.id
JOIN users requester ON r.requester_id = requester.id
LEFT JOIN users pm_director ON r.pm_director_id = pm_director.id
ORDER BY r.created_at DESC;

-- Grant access to the view
GRANT SELECT ON pm_hours_removal_dashboard TO authenticated;
