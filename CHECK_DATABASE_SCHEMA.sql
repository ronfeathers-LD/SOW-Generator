-- Database Schema Check for Approval Workflow
-- Run this in your Supabase SQL Editor

-- 1. RLS Policies for approval_stages
SELECT 
  'approval_stages' as table_name,
  schemaname, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'approval_stages';

-- 2. RLS Policies for sow_approvals
SELECT 
  'sow_approvals' as table_name,
  schemaname, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'sow_approvals';

-- 3. RLS Status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('approval_stages', 'sow_approvals');

-- 4. Current approval_stages data
SELECT id, name, description, sort_order, is_active, created_at 
FROM approval_stages 
ORDER BY sort_order;

-- 5. Current sow_approvals data
SELECT 
  sa.id,
  sa.sow_id,
  sa.stage_id,
  sa.status,
  sa.approver_id,
  sa.created_at,
  ast.name as stage_name
FROM sow_approvals sa
LEFT JOIN approval_stages ast ON ast.id = sa.stage_id
ORDER BY sa.created_at DESC;

-- 6. Foreign key constraints
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('approval_stages', 'sow_approvals')
  AND tc.constraint_type = 'FOREIGN KEY';

