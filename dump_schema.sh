#!/bin/bash
# Database schema dump script

# This will dump the schema including tables, policies, and constraints

psql $DATABASE_URL << 'EOF'
-- Dump schema for approval-related tables

-- approval_stages table
\echo '========================================='
\echo 'APPROVAL_STAGES TABLE'
\echo '========================================='
\d approval_stages

-- Show RLS policies for approval_stages
\echo ''
\echo 'Row Level Security Policies for approval_stages:'
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'approval_stages';

-- sow_approvals table
\echo ''
\echo '========================================='
\echo 'SOW_APPROVALS TABLE'
\echo '========================================='
\d sow_approvals

-- Show RLS policies for sow_approvals
\echo ''
\echo 'Row Level Security Policies for sow_approvals:'
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'sow_approvals';

-- Check if RLS is enabled
\echo ''
\echo '========================================='
\echo 'RLS STATUS'
\echo '========================================='
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('approval_stages', 'sow_approvals');

-- Show current data
\echo ''
\echo '========================================='
\echo 'CURRENT APPROVAL_STAGES DATA'
\echo '========================================='
SELECT * FROM approval_stages ORDER BY sort_order;

\echo ''
\echo '========================================='
\echo 'CURRENT SOW_APPROVALS DATA'
\echo '========================================='
SELECT * FROM sow_approvals;
EOF

