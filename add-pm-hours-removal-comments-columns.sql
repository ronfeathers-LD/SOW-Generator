-- Add missing columns to pm_hours_removal_comments table
-- This migration adds the columns that the PM hours removal system expects

-- Add missing columns to pm_hours_removal_comments table
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES pm_hours_removal_comments(id) ON DELETE CASCADE;
ALTER TABLE pm_hours_removal_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Create trigger for updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_hours_removal_comments_updated_at') THEN
        CREATE TRIGGER update_pm_hours_removal_comments_updated_at 
          BEFORE UPDATE ON pm_hours_removal_comments 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
