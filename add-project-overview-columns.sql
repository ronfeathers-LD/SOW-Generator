-- Add Project Overview columns to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS timeline_weeks TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS number_of_units TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS regions TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_tenants TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS units_consumption TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_contact_id TEXT;

-- Add custom content columns if they don't exist
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_intro_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_scope_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_objectives_disclosure_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_assumptions_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_project_phases_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_roles_content TEXT;

-- Add content edited flags if they don't exist
ALTER TABLE sows ADD COLUMN IF NOT EXISTS intro_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS scope_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS objectives_disclosure_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS assumptions_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_phases_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS roles_content_edited BOOLEAN DEFAULT false; 