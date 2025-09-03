-- Complete Slack User Mapping Migration
-- This script adds Slack user ID fields to the users table for @mention functionality

-- Add Slack user ID fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_mapping_updated_at TIMESTAMP WITH TIME ZONE;

-- Add constraints for data integrity (drop first if they exist)
DO $$ 
BEGIN
    -- Drop constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_slack_user_id_format') THEN
        ALTER TABLE users DROP CONSTRAINT check_slack_user_id_format;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_slack_username_format') THEN
        ALTER TABLE users DROP CONSTRAINT check_slack_username_format;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_slack_user_id') THEN
        ALTER TABLE users DROP CONSTRAINT unique_slack_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_slack_username') THEN
        ALTER TABLE users DROP CONSTRAINT unique_slack_username;
    END IF;
END $$;

-- Add constraints for data integrity
ALTER TABLE users ADD CONSTRAINT check_slack_user_id_format 
  CHECK (slack_user_id IS NULL OR slack_user_id ~ '^U[A-Z0-9]{8,}$');

ALTER TABLE users ADD CONSTRAINT check_slack_username_format 
  CHECK (slack_username IS NULL OR slack_username ~ '^[a-z0-9._-]+$');

-- Add unique constraints (a Slack user can only be mapped to one app user)
-- Note: These constraints only apply to non-null values
ALTER TABLE users ADD CONSTRAINT unique_slack_user_id 
  UNIQUE (slack_user_id);

ALTER TABLE users ADD CONSTRAINT unique_slack_username 
  UNIQUE (slack_username);

-- Add indexes for faster Slack user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_username ON users(slack_username);
CREATE INDEX IF NOT EXISTS idx_users_slack_mapping_updated_at ON users(slack_mapping_updated_at);

-- Add comments explaining the new fields
COMMENT ON COLUMN users.slack_user_id IS 'Slack user ID (e.g., U1234567890) for @mention notifications';
COMMENT ON COLUMN users.slack_username IS 'Slack username (e.g., john.doe) for @mention detection in comments';
COMMENT ON COLUMN users.slack_mapping_updated_at IS 'Timestamp when Slack mapping was last updated';

-- Create a view for easy Slack user mapping lookups (without SECURITY DEFINER)
CREATE OR REPLACE VIEW slack_user_mappings AS
SELECT 
    id,
    email,
    name,
    slack_user_id,
    slack_username,
    role,
    slack_mapping_updated_at,
    CASE 
        WHEN slack_user_id IS NOT NULL AND slack_username IS NOT NULL THEN 'complete'
        WHEN slack_user_id IS NOT NULL OR slack_username IS NOT NULL THEN 'partial'
        ELSE 'none'
    END as mapping_status
FROM users 
WHERE slack_user_id IS NOT NULL OR slack_username IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON slack_user_mappings TO authenticated;

-- Create a function to automatically update Slack mappings
CREATE OR REPLACE FUNCTION update_slack_mapping(
    user_email TEXT,
    slack_user_id TEXT DEFAULT NULL,
    slack_username TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        slack_user_id = COALESCE(slack_user_id, users.slack_user_id),
        slack_username = COALESCE(slack_username, users.slack_username),
        slack_mapping_updated_at = NOW()
    WHERE email = user_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_slack_mapping(TEXT, TEXT, TEXT) TO authenticated;
