-- Quick Migration: Add New Approval Stages
-- Run this file to add the new PS/PM/Sr. Leadership approval stages
-- Safe to run on your existing database
-- Date: 2024

-- Add the three new approval stages
INSERT INTO approval_stages (name, description, sort_order) VALUES
  ('Professional Services', 'Professional Services team review and approval', 1),
  ('Project Management', 'Project Management review and approval', 2),
  ('Sr. Leadership', 'Senior Leadership final approval', 3)
ON CONFLICT DO NOTHING;

-- Done! That's it.
-- No other database changes needed.

