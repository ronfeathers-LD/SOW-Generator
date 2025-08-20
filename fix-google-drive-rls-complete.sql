-- Complete fix for google_drive_configs RLS policies
-- This script will completely reset and recreate the RLS setup

-- First, disable RLS temporarily
ALTER TABLE google_drive_configs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (if any exist)
DROP POLICY IF EXISTS "Allow authenticated users to view google drive configs" ON google_drive_configs;
DROP POLICY IF EXISTS "Allow authenticated users to insert google drive configs" ON google_drive_configs;
DROP POLICY IF EXISTS "Allow authenticated users to update google drive configs" ON google_drive_configs;
DROP POLICY IF EXISTS "Allow authenticated users to delete google drive configs" ON google_drive_configs;
DROP POLICY IF EXISTS "Allow admin users to modify google drive configs" ON google_drive_configs;

-- Re-enable RLS
ALTER TABLE google_drive_configs ENABLE ROW LEVEL SECURITY;

-- Create a single, simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON google_drive_configs
    FOR ALL USING (auth.role() = 'authenticated');

-- Alternative: If you want to be more specific, uncomment these instead:
-- CREATE POLICY "Allow view for authenticated users" ON google_drive_configs
--     FOR SELECT USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow insert for authenticated users" ON google_drive_configs
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow update for authenticated users" ON google_drive_configs
--     FOR UPDATE USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow delete for authenticated users" ON google_drive_configs
--     FOR DELETE USING (auth.role() = 'authenticated');

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'google_drive_configs';
