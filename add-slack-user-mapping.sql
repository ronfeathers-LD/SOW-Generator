-- Add Slack user ID fields to users table for @mention functionality
-- This allows mapping internal users to their Slack user IDs

-- Add Slack user ID field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_username TEXT;

-- Add index for faster Slack user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_username ON users(slack_username);

-- Add comment explaining the new fields
COMMENT ON COLUMN users.slack_user_id IS 'Slack user ID (e.g., U1234567890) for @mention notifications';
COMMENT ON COLUMN users.slack_username IS 'Slack username (e.g., john.doe) for @mention detection in comments';

-- Create a view for easy Slack user mapping lookups
CREATE OR REPLACE VIEW slack_user_mappings AS
SELECT 
    id,
    email,
    name,
    slack_user_id,
    slack_username,
    role
FROM users 
WHERE slack_user_id IS NOT NULL OR slack_username IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON slack_user_mappings TO authenticated;

-- Example data (you can update these with actual values)
-- UPDATE users SET slack_user_id = 'U1234567890', slack_username = 'john.doe' WHERE email = 'john.doe@company.com';
-- UPDATE users SET slack_user_id = 'U0987654321', slack_username = 'sarah.smith' WHERE email = 'sarah.smith@company.com';
