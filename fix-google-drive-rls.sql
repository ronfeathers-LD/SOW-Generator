-- Fix RLS policies for google_drive_configs table
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view google drive configs" ON google_drive_configs;
DROP POLICY IF EXISTS "Allow admin users to modify google drive configs" ON google_drive_configs;

-- Create new, more flexible policies
-- Allow authenticated users to view configs
CREATE POLICY "Allow authenticated users to view google drive configs" ON google_drive_configs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert (for initial setup)
CREATE POLICY "Allow authenticated users to insert google drive configs" ON google_drive_configs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update configs
CREATE POLICY "Allow authenticated users to update google drive configs" ON google_drive_configs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete configs
CREATE POLICY "Allow authenticated users to delete google drive configs" ON google_drive_configs
    FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: If you want to be more restrictive, you can use this instead:
-- CREATE POLICY "Allow admin users to modify google drive configs" ON google_drive_configs
--     FOR ALL USING (
--         auth.role() = 'authenticated' AND 
--         (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN ('your-admin-email@example.com'))
--     );
