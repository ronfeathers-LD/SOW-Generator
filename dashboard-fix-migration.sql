-- Dashboard Fix Migration
-- This script adds the missing database structures needed for the dashboard to work properly

-- First, let's check what columns exist in the sows table
-- Run this to see your current structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sows' ORDER BY ordinal_position;

-- Add missing is_hidden field to sows table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'is_hidden') THEN
        ALTER TABLE sows ADD COLUMN is_hidden BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_hidden column to sows table';
    ELSE
        RAISE NOTICE 'is_hidden column already exists in sows table';
    END IF;
END $$;

-- Check if sow_title field exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'sow_title') THEN
        ALTER TABLE sows ADD COLUMN sow_title TEXT;
        -- Update existing rows to have a default value
        UPDATE sows SET sow_title = 'Untitled SOW - ' || COALESCE(client_name, 'Unknown Client') WHERE sow_title IS NULL;
        RAISE NOTICE 'Added sow_title column to sows table';
    ELSE
        RAISE NOTICE 'sow_title column already exists in sows table';
    END IF;
END $$;

-- Add any missing fields that might be needed
DO $$
BEGIN
    -- Add content field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'content') THEN
        ALTER TABLE sows ADD COLUMN content TEXT DEFAULT '';
        RAISE NOTICE 'Added content column to sows table';
    ELSE
        RAISE NOTICE 'content column already exists in sows table';
    END IF;
    
    -- Add addendums field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'addendums') THEN
        ALTER TABLE sows ADD COLUMN addendums JSONB DEFAULT '[]';
        RAISE NOTICE 'Added addendums column to sows table';
    ELSE
        RAISE NOTICE 'addendums column already exists in sows table';
    END IF;
END $$;

-- Create approval_stages table if it doesn't exist
CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create sow_approvals table if it doesn't exist
CREATE TABLE IF NOT EXISTS sow_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES approval_stages(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  approver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Create approval_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  comments TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create approval_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS approval_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1
);

-- Insert default approval stages (only if table is empty)
INSERT INTO approval_stages (name, description, sort_order) 
SELECT 'Legal Review', 'Legal team review and approval', 1
WHERE NOT EXISTS (SELECT 1 FROM approval_stages);

INSERT INTO approval_stages (name, description, sort_order) 
SELECT 'Finance Review', 'Finance team review and approval', 2
WHERE NOT EXISTS (SELECT 1 FROM approval_stages WHERE name = 'Finance Review');

INSERT INTO approval_stages (name, description, sort_order) 
SELECT 'Executive Approval', 'Executive team final approval', 3
WHERE NOT EXISTS (SELECT 1 FROM approval_stages WHERE name = 'Executive Approval');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on new tables (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_stages_updated_at') THEN
        CREATE TRIGGER update_approval_stages_updated_at 
          BEFORE UPDATE ON approval_stages 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger for approval_stages';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sow_approvals_updated_at') THEN
        CREATE TRIGGER update_sow_approvals_updated_at 
          BEFORE UPDATE ON sow_approvals 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger for sow_approvals';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_audit_log_updated_at') THEN
        CREATE TRIGGER update_approval_audit_log_updated_at 
          BEFORE UPDATE ON approval_audit_log 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger for approval_audit_log';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_comments_updated_at') THEN
        CREATE TRIGGER update_approval_comments_updated_at 
          BEFORE UPDATE ON approval_comments 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger for approval_comments';
    END IF;
END $$;

-- Enable Row Level Security (RLS) on new tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_stages') THEN
        ALTER TABLE approval_stages ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on approval_stages';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sow_approvals') THEN
        ALTER TABLE sow_approvals ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on sow_approvals';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_audit_log') THEN
        ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on approval_audit_log';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_comments') THEN
        ALTER TABLE approval_comments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on approval_comments';
    END IF;
END $$;

-- Create policies for new tables (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_stages' AND policyname = 'Public read access to approval stages') THEN
        CREATE POLICY "Public read access to approval stages" ON approval_stages FOR SELECT USING (true);
        RAISE NOTICE 'Created policy for approval_stages';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sow_approvals' AND policyname = 'Public read access to sow approvals') THEN
        CREATE POLICY "Public read access to sow approvals" ON sow_approvals FOR SELECT USING (true);
        RAISE NOTICE 'Created policy for sow_approvals';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_audit_log' AND policyname = 'Public read access to approval audit log') THEN
        CREATE POLICY "Public read access to approval audit log" ON approval_audit_log FOR SELECT USING (true);
        RAISE NOTICE 'Created policy for approval_audit_log';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_comments' AND policyname = 'Public read access to approval comments') THEN
        CREATE POLICY "Public read access to approval comments" ON approval_comments FOR SELECT USING (true);
        RAISE NOTICE 'Created policy for approval_comments';
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sow_approvals_sow_id') THEN
        CREATE INDEX idx_sow_approvals_sow_id ON sow_approvals(sow_id);
        RAISE NOTICE 'Created index for sow_approvals.sow_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sow_approvals_status') THEN
        CREATE INDEX idx_sow_approvals_status ON sow_approvals(status);
        RAISE NOTICE 'Created index for sow_approvals.status';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sow_approvals_created_at') THEN
        CREATE INDEX idx_sow_approvals_created_at ON sow_approvals(created_at DESC);
        RAISE NOTICE 'Created index for sow_approvals.created_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_stages_sort_order') THEN
        CREATE INDEX idx_approval_stages_sort_order ON approval_stages(sort_order);
        RAISE NOTICE 'Created index for approval_stages.sort_order';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_audit_log_sow_id') THEN
        CREATE INDEX idx_approval_audit_log_sow_id ON approval_audit_log(sow_id);
        RAISE NOTICE 'Created index for approval_audit_log.sow_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_audit_log_user_id') THEN
        CREATE INDEX idx_approval_audit_log_user_id ON approval_audit_log(user_id);
        RAISE NOTICE 'Created index for approval_audit_log.user_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_audit_log_created_at') THEN
        CREATE INDEX idx_approval_audit_log_created_at ON approval_audit_log(created_at DESC);
        RAISE NOTICE 'Created index for approval_audit_log.created_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_comments_sow_id') THEN
        CREATE INDEX idx_approval_comments_sow_id ON approval_comments(sow_id);
        RAISE NOTICE 'Created index for approval_comments.sow_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_comments_user_id') THEN
        CREATE INDEX idx_approval_comments_user_id ON approval_comments(user_id);
        RAISE NOTICE 'Created index for approval_comments.user_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_comments_created_at') THEN
        CREATE INDEX idx_approval_comments_created_at ON approval_comments(created_at DESC);
        RAISE NOTICE 'Created index for approval_comments.created_at';
    END IF;
END $$;

-- Update existing SOWs to have a default sow_title if they don't have one
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'sow_title') THEN
        UPDATE sows 
        SET sow_title = COALESCE(sow_title, 'Untitled SOW - ' || COALESCE(client_name, 'Unknown Client'))
        WHERE sow_title IS NULL OR sow_title = '';
        RAISE NOTICE 'Updated existing SOWs with default titles';
    END IF;
END $$;

-- Set is_hidden to false for all existing SOWs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'is_hidden') THEN
        UPDATE sows SET is_hidden = false WHERE is_hidden IS NULL;
        RAISE NOTICE 'Updated existing SOWs with is_hidden = false';
    END IF;
END $$;

-- Migration completed successfully
DO $$
BEGIN
    RAISE NOTICE 'Dashboard migration completed successfully!';
    RAISE NOTICE 'All required tables, fields, and relationships have been created.';
END $$;
