-- Fix RLS Policies for approval workflow tables
-- This adds the missing INSERT policy that's blocking workflow initialization

-- Check current policies first
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('approval_stages', 'sow_approvals');

-- Add INSERT policy for sow_approvals (likely missing)
DO $$
BEGIN
  -- Only add if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sow_approvals' 
    AND policyname = 'Users can insert sow approvals'
  ) THEN
    CREATE POLICY "Users can insert sow approvals" 
    ON sow_approvals FOR INSERT 
    WITH CHECK (true);
    RAISE NOTICE 'Added INSERT policy for sow_approvals';
  ELSE
    RAISE NOTICE 'INSERT policy already exists for sow_approvals';
  END IF;
END $$;

-- Add UPDATE policy for sow_approvals (might be missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sow_approvals' 
    AND policyname = 'Users can update sow approvals'
  ) THEN
    CREATE POLICY "Users can update sow approvals" 
    ON sow_approvals FOR UPDATE 
    USING (true);
    RAISE NOTICE 'Added UPDATE policy for sow_approvals';
  ELSE
    RAISE NOTICE 'UPDATE policy already exists for sow_approvals';
  END IF;
END $$;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('approval_stages', 'sow_approvals');

-- Show updated policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('approval_stages', 'sow_approvals')
ORDER BY tablename, policyname;

