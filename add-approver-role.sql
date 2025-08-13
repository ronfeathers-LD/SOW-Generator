-- Simplify user roles to just: user, manager, admin
-- This script updates the role constraint to only allow these three roles

-- First, let's see what roles currently exist
SELECT DISTINCT role FROM users ORDER BY role;

-- Update any existing users with old roles to use the new system
-- Change director and vp to manager
UPDATE users SET role = 'manager' WHERE role IN ('director', 'vp');

-- Change any other unexpected roles to 'user' (safe default)
UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'manager', 'admin');

-- Now drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;

-- Add the new simplified constraint
ALTER TABLE users ADD CONSTRAINT check_user_role 
CHECK (role = ANY (ARRAY['user'::text, 'manager'::text, 'admin'::text]));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'check_user_role';

-- Show final user roles
SELECT email, role FROM users ORDER BY role, email;
