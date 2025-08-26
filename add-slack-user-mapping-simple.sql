-- Simple Slack User Mapping Migration
-- This script adds basic Slack user ID fields to the users table
-- Use this version if the complete migration has compatibility issues

-- Add Slack user ID fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_mapping_updated_at TIMESTAMP WITH TIME ZONE;

-- Add basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_username ON users(slack_username);
CREATE INDEX IF NOT EXISTS idx_users_slack_mapping_updated_at ON users(slack_mapping_updated_at);

-- Add comments explaining the new fields
COMMENT ON COLUMN users.slack_user_id IS 'Slack user ID (e.g., U1234567890) for @mention notifications';
COMMENT ON COLUMN users.slack_username IS 'Slack username (e.g., john.doe) for @mention detection in comments';
COMMENT ON COLUMN users.slack_mapping_updated_at IS 'Timestamp when Slack mapping was last updated';
