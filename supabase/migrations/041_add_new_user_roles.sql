-- Migration: Add new user roles
-- Safe migration that doesn't break existing data
-- Created: Multi-step approval implementation

-- This migration adds support for new roles: sales, pro_services, solution_consultant
-- without breaking existing functionality

-- Note: We're NOT adding a CHECK constraint here because:
-- 1. It would require all existing rows to be valid
-- 2. Could cause migration failures in production
-- 3. Role validation should happen at application level anyway

-- The role field remains TEXT without constraints
-- Application code will enforce valid role values

-- Valid roles going forward:
-- - 'user' (base user)
-- - 'sales' (sales team)
-- - 'pro_services' (PS team member)
-- - 'solution_consultant' (solution consultant)
-- - 'manager' (PS Manager, can approve Stage 1)
-- - 'pmo' (PMO team, can approve Stage 2)
-- - 'admin' (full system access)

-- No database schema changes needed - just application-level validation
-- Existing roles continue to work as-is

