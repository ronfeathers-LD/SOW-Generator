-- Bulk Update Slack Mappings for Existing Users
-- This script matches existing users with Slack users based on email addresses
-- Run this after setting up your Slack bot token

-- First, create a temporary function to fetch Slack users and update mappings
CREATE OR REPLACE FUNCTION bulk_update_slack_mappings() RETURNS TABLE(
    email TEXT,
    slack_user_id TEXT,
    slack_username TEXT,
    updated BOOLEAN
) AS $$
DECLARE
    slack_user RECORD;
    app_user RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- This function would need to be called from your application
    -- since it requires Slack API access
    
    -- For now, we'll create a template that you can use
    -- to manually update specific users
    
    -- Example manual updates (replace with actual values):
    -- UPDATE users SET slack_user_id = 'U1234567890', slack_username = 'john.doe', slack_mapping_updated_at = NOW() WHERE email = 'john.doe@company.com';
    -- UPDATE users SET slack_user_id = 'U0987654321', slack_username = 'sarah.smith', slack_mapping_updated_at = NOW() WHERE email = 'sarah.smith@company.com';
    
    -- Return empty result for now
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler function for manual updates
CREATE OR REPLACE FUNCTION manual_update_slack_mapping(
    user_email TEXT,
    slack_user_id TEXT,
    slack_username TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        slack_user_id = manual_update_slack_mapping.slack_user_id,
        slack_username = manual_update_slack_mapping.slack_username,
        slack_mapping_updated_at = NOW()
    WHERE email = user_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION manual_update_slack_mapping(TEXT, TEXT, TEXT) TO authenticated;

-- Example usage:
-- SELECT manual_update_slack_mapping('john.doe@company.com', 'U1234567890', 'john.doe');
-- SELECT manual_update_slack_mapping('sarah.smith@company.com', 'U0987654321', 'sarah.smith');
