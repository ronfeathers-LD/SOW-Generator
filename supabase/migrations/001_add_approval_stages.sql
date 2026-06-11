-- Migration: Add new approval stages
-- Safe to run on existing database
-- Created: Multi-step approval implementation
-- Date: 2024

-- Add new approval stages for multi-step workflow
-- This replaces the old Legal/Finance/Executive stages with PS/PM/Sr. Leadership stages
INSERT INTO approval_stages (name, description, sort_order) VALUES
  ('Professional Services', 'Professional Services team review and approval', 1),
  ('Project Management', 'Project Management review and approval', 2),
  ('Sr. Leadership', 'Senior Leadership final approval', 3)
ON CONFLICT DO NOTHING;

-- Note: If you had old stages (Legal Review, Finance Review, Executive Approval)
-- and want to keep using them, these new stages will just add alongside them.
-- You can disable the old ones by setting is_active = false later.

-- To see all stages:
-- SELECT * FROM approval_stages ORDER BY sort_order;

-- To disable old stages if needed:
-- UPDATE approval_stages SET is_active = false WHERE name IN ('Legal Review', 'Finance Review', 'Executive Approval');

