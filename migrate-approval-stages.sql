-- Migration script to add assigned_role column to approval_stages table

-- Step 1: Add the assigned_role column
ALTER TABLE approval_stages 
ADD COLUMN IF NOT EXISTS assigned_role TEXT;

-- Step 2: Update existing stages with default role assignments
UPDATE approval_stages 
SET assigned_role = 'manager' 
WHERE name = 'Manager Approval' AND assigned_role IS NULL;

UPDATE approval_stages 
SET assigned_role = 'director' 
WHERE name = 'Director Approval' AND assigned_role IS NULL;

UPDATE approval_stages 
SET assigned_role = 'vp' 
WHERE name = 'VP Approval' AND assigned_role IS NULL;

-- Step 3: Verify the migration
SELECT id, name, description, sort_order, assigned_role 
FROM approval_stages 
ORDER BY sort_order;
