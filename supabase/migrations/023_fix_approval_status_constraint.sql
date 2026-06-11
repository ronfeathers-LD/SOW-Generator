-- Fix the check_approval_status constraint to allow 'not_started' and 'skipped' status values
-- This migration fixes the constraint violation error when creating approval workflows

-- First, drop the existing constraint if it exists
ALTER TABLE sow_approvals 
DROP CONSTRAINT IF EXISTS check_approval_status;

-- Add the new constraint with all allowed status values
-- Allowed values: 'pending', 'approved', 'rejected', 'not_started', 'skipped'
ALTER TABLE sow_approvals
ADD CONSTRAINT check_approval_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'not_started', 'skipped'));

