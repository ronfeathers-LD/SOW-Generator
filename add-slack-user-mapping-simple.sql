-- Simple Slack User Mapping Migration
-- This script adds Slack user ID fields to the users table for @mention functionality
-- Uses basic PostgreSQL syntax for maximum compatibility

-- Add Slack user ID fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_mapping_updated_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for faster Slack user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_username ON users(slack_username);
CREATE INDEX IF NOT EXISTS idx_users_slack_mapping_updated_at ON users(slack_mapping_updated_at);

-- Add comments explaining the new fields
COMMENT ON COLUMN users.slack_user_id IS 'Slack user ID (e.g., U1234567890) for @mention notifications';
COMMENT ON COLUMN users.slack_username IS 'Slack username (e.g., john.doe) for @mention detection in comments';
COMMENT ON COLUMN users.slack_mapping_updated_at IS 'Timestamp when Slack mapping was last updated';

-- Create a view for easy Slack user mapping lookups
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

-- Create a function to get mapping statistics
CREATE OR REPLACE FUNCTION get_slack_mapping_stats() 
RETURNS TABLE(
    total_users BIGINT,
    mapped_users BIGINT,
    unmapped_users BIGINT,
    complete_mappings BIGINT,
    partial_mappings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_users,
        COUNT(CASE WHEN slack_user_id IS NOT NULL OR slack_username IS NOT NULL THEN 1 END)::BIGINT as mapped_users,
        COUNT(CASE WHEN slack_user_id IS NULL AND slack_username IS NULL THEN 1 END)::BIGINT as unmapped_users,
        COUNT(CASE WHEN slack_user_id IS NOT NULL AND slack_username IS NOT NULL THEN 1 END)::BIGINT as complete_mappings,
        COUNT(CASE WHEN (slack_user_id IS NOT NULL AND slack_username IS NULL) OR (slack_user_id IS NULL AND slack_username IS NOT NULL) THEN 1 END)::BIGINT as partial_mappings
    FROM users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_slack_mapping_stats() TO authenticated;
