-- Add project phases content columns to SOW table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_project_phases_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_phases_content_edited BOOLEAN DEFAULT false; 