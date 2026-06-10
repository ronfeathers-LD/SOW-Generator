-- Enable RLS on pricing_roles_config table
-- This fixes the security issue where policies exist but RLS is not enabled

ALTER TABLE pricing_roles_config ENABLE ROW LEVEL SECURITY;


