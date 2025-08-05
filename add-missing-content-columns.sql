-- Add missing content columns for SOW table
-- This migration adds all the content-related columns that the API expects

-- Objectives Disclosure content columns
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_objectives_disclosure_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS objectives_disclosure_content_edited BOOLEAN DEFAULT false;

-- Assumptions content columns  
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_assumptions_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS assumptions_content_edited BOOLEAN DEFAULT false;

-- Ensure all other content columns exist (in case previous migrations weren't run)
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_intro_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS intro_content_edited BOOLEAN DEFAULT false;

ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_scope_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS scope_content_edited BOOLEAN DEFAULT false;

ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_project_phases_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_phases_content_edited BOOLEAN DEFAULT false;

ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_roles_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS roles_content_edited BOOLEAN DEFAULT false;

-- Add salesforce_account_id column if it doesn't exist
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT; 