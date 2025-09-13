-- Migration to add other_products_units column to sows table
-- This field is needed to store units for products in the "other" category (like NotifyPlus)

-- Add the new column to the sows table
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS other_products_units VARCHAR(255) DEFAULT '';

-- Update the existing SOW templates to include the new field
-- This ensures existing SOWs have the field in their template JSON
UPDATE sows 
SET template = jsonb_set(
  COALESCE(template, '{}'::jsonb),
  '{other_products_units}',
  '""'::jsonb
)
WHERE template IS NULL OR NOT template ? 'other_products_units';

-- Verify the migration
SELECT 
  id,
  sow_title,
  CASE 
    WHEN template ? 'other_products_units' THEN 'Has field'
    ELSE 'Missing field'
  END as other_products_units_status
FROM sows 
LIMIT 5;
