-- Clean up conflicting RLS policies for google_drive_configs
-- Drop the conflicting policy that was created earlier
DROP POLICY IF EXISTS "Allow authenticated users to modify google drive configs" ON google_drive_configs;

-- Verify only one policy remains
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'google_drive_configs';

-- Test if the insert works now
-- If you still get RLS errors, try this temporary bypass:
-- ALTER TABLE google_drive_configs DISABLE ROW LEVEL SECURITY;
-- [Test your insert here]
-- ALTER TABLE google_drive_configs ENABLE ROW LEVEL SECURITY;
