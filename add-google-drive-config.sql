-- Add Google Drive configuration table
CREATE TABLE IF NOT EXISTS google_drive_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE google_drive_configs ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view configs
CREATE POLICY "Allow authenticated users to view google drive configs" ON google_drive_configs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow admin users to modify configs
CREATE POLICY "Allow admin users to modify google drive configs" ON google_drive_configs
    FOR ALL USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Create index for active configs
CREATE INDEX IF NOT EXISTS idx_google_drive_configs_active ON google_drive_configs(is_active);

-- Add comment
COMMENT ON TABLE google_drive_configs IS 'Configuration for Google Drive API integration';
COMMENT ON COLUMN google_drive_configs.client_id IS 'Google OAuth2 client ID';
COMMENT ON COLUMN google_drive_configs.client_secret IS 'Google OAuth2 client secret';
COMMENT ON COLUMN google_drive_configs.redirect_uri IS 'OAuth2 redirect URI for Google Drive';
COMMENT ON COLUMN google_drive_configs.refresh_token IS 'OAuth2 refresh token for Google Drive access';
COMMENT ON COLUMN google_drive_configs.access_token IS 'OAuth2 access token for Google Drive API calls';
COMMENT ON COLUMN google_drive_configs.token_expiry IS 'When the access token expires';
COMMENT ON COLUMN google_drive_configs.is_active IS 'Whether this configuration is currently active';
