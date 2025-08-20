-- Check the current redirect URI in google_drive_configs
SELECT 
    client_id,
    redirect_uri,
    is_active,
    created_at
FROM google_drive_configs 
WHERE is_active = true;
