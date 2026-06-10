-- Add description and sort_order columns to pricing_roles_config table
ALTER TABLE pricing_roles_config 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing roles with default descriptions and sort order
UPDATE pricing_roles_config SET 
  description = 'Manages customer onboarding process and initial setup',
  sort_order = 1
WHERE role_name = 'Onboarding Specialist';

UPDATE pricing_roles_config SET 
  description = 'Oversees project execution, timeline, and team coordination',
  sort_order = 2
WHERE role_name = 'Project Manager';

UPDATE pricing_roles_config SET 
  description = 'Provides technical leadership and architectural guidance',
  sort_order = 3
WHERE role_name = 'Technical Lead';

UPDATE pricing_roles_config SET 
  description = 'Develops and implements technical solutions',
  sort_order = 4
WHERE role_name = 'Developer';

UPDATE pricing_roles_config SET 
  description = 'Ensures quality through testing and validation',
  sort_order = 5
WHERE role_name = 'QA Engineer';

-- Create index for better performance on sort_order
CREATE INDEX IF NOT EXISTS idx_pricing_roles_config_sort_order ON pricing_roles_config(sort_order);
