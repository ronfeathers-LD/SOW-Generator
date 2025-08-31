-- Fix User Role Constraint Issue
-- This script updates the role system to include PMO role and removes pm_director field
-- New role system: 'user' | 'manager' | 'admin' | 'pmo'

-- First, let's see what roles currently exist in the users table
SELECT DISTINCT role FROM users ORDER BY role;

-- Check current roles and identify migration needs
SELECT id, name, email, role, pm_director FROM users 
WHERE role NOT IN ('user', 'manager', 'admin', 'pmo');

-- Show current state before migration
SELECT 
    id, 
    name, 
    email, 
    role, 
    pm_director,
    CASE 
        WHEN role = 'admin' AND pm_director = true THEN 'Admin + PM Director → PMO'
        WHEN role = 'manager' AND pm_director = true THEN 'Manager + PM Director → PMO'
        WHEN role = 'user' AND pm_director = true THEN 'User + PM Director → PMO'
        WHEN role = 'admin' AND pm_director = false THEN 'Admin (no change)'
        WHEN role = 'manager' AND pm_director = false THEN 'Manager (no change)'
        WHEN role = 'user' AND pm_director = false THEN 'User (no change)'
        ELSE 'Unknown Combination'
    END as migration_plan
FROM users 
ORDER BY role, pm_director;

-- Step 1: Migrate users with pm_director = true to PMO role
UPDATE users 
SET role = 'pmo' 
WHERE pm_director = true;

-- Step 2: Update any users with invalid roles to 'user' (default)
UPDATE users 
SET role = 'user' 
WHERE role NOT IN ('user', 'manager', 'admin', 'pmo');

-- Step 3: Verify the migration
SELECT id, name, email, role FROM users 
WHERE role NOT IN ('user', 'manager', 'admin', 'pmo');

-- Show migration results
SELECT 
    id, 
    name, 
    email, 
    role,
    CASE 
        WHEN role = 'pmo' THEN 'PMO (migrated from PM Director)'
        ELSE role || ' (no change)'
    END as final_role
FROM users 
ORDER BY role, name;

-- Now let's drop and recreate the role constraint to include PMO role
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;

-- Add the constraint back with the new PMO role
ALTER TABLE users ADD CONSTRAINT check_user_role
CHECK (role = ANY (ARRAY['user'::text, 'manager'::text, 'admin'::text, 'pmo'::text]));

-- Verify the constraint is working
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'check_user_role';

-- Optional: Remove the pm_director column since it's no longer needed
-- Note: Only uncomment this if you're sure you want to remove the column
-- ALTER TABLE users DROP COLUMN IF EXISTS pm_director;

-- Show final state of users table with new role system
SELECT 
    id, 
    name, 
    email, 
    role,
    CASE 
        WHEN role = 'admin' THEN 'Administrator - Full system access'
        WHEN role = 'pmo' THEN 'PMO - PM hours management + basic access'
        WHEN role = 'manager' THEN 'Manager - Team oversight + basic access'
        WHEN role = 'user' THEN 'User - Basic SOW access'
        ELSE 'Unknown Role'
    END as role_description,
    created_at
FROM users 
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1
        WHEN 'pmo' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'user' THEN 4
        ELSE 5
    END,
    name;

-- Summary of what this script does:
-- 1. Shows current roles and migration plan
-- 2. Migrates users with pm_director = true to 'pmo' role
-- 3. Updates any invalid roles to 'user' (default)
-- 4. Drops and recreates the role constraint to include 'pmo'
-- 5. Shows final user state with new unified role system
-- 6. New role system: user | manager | pmo | admin
