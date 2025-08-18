-- Create Slack configuration table for storing webhook URLs, bot tokens, and other settings
CREATE TABLE IF NOT EXISTS slack_config (
    id SERIAL PRIMARY KEY,
    webhook_url TEXT NOT NULL,
    channel TEXT,
    username TEXT DEFAULT 'SOW Generator',
    icon_emoji TEXT DEFAULT ':memo:',
    bot_token TEXT,
    workspace_domain TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a unique constraint to ensure only one config record
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD CONSTRAINT
-- We'll handle this by checking if the constraint exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_slack_config'
    ) THEN
        ALTER TABLE slack_config ADD CONSTRAINT unique_slack_config UNIQUE (id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
END $$;

-- Insert default configuration if table is empty
-- Note: We'll insert empty values and let the application handle environment variables
INSERT INTO slack_config (webhook_url, channel, username, icon_emoji, is_enabled)
SELECT 
    '', -- webhook_url (will be set via admin interface)
    '', -- channel (will be set via admin interface)
    'SOW Generator', -- username (default)
    ':memo:', -- icon_emoji (default)
    false -- is_enabled (will be enabled when webhook is configured)
WHERE NOT EXISTS (SELECT 1 FROM slack_config);

-- Grant permissions
GRANT ALL ON slack_config TO authenticated;
GRANT ALL ON slack_config_id_seq TO authenticated;

-- Add comments
COMMENT ON TABLE slack_config IS 'Stores Slack integration configuration including webhook URLs and bot tokens';
COMMENT ON COLUMN slack_config.webhook_url IS 'Slack incoming webhook URL for sending messages';
COMMENT ON COLUMN slack_config.bot_token IS 'Slack bot token for @mention functionality and user lookup';
COMMENT ON COLUMN slack_config.workspace_domain IS 'Slack workspace domain (e.g., company.slack.com)';
