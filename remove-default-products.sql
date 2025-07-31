-- Remove default value for products column in sows table
-- This ensures no default products are set when creating new SOWs
ALTER TABLE sows ALTER COLUMN products DROP DEFAULT;
ALTER TABLE sows ALTER COLUMN products SET DEFAULT '[]'::jsonb; 