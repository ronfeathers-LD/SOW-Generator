-- Migration: Remove public SOW view and related policies
-- This migration removes the unused public SOW view functionality
-- and cleans up the database policies that were created for it

-- Remove public read access policies that are no longer needed
DROP POLICY IF EXISTS "Public read access to SOWs" ON sows;
DROP POLICY IF EXISTS "Public read access to sow approvals" ON sow_approvals;

-- Note: The public/sow route and API endpoint files have been removed from the codebase
-- This migration only handles the database cleanup

-- Verify policies have been removed
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('sows', 'sow_approvals') 
AND policyname LIKE '%Public%';
