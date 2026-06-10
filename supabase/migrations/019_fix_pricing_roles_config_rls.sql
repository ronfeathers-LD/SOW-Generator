-- Fix RLS policies for pricing_roles_config table
-- The current policies reference auth.users.raw_user_meta_data which doesn't match our schema
-- We need to reference the users table directly

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read pricing roles config" ON pricing_roles_config;
DROP POLICY IF EXISTS "Admins can insert pricing roles config" ON pricing_roles_config;
DROP POLICY IF EXISTS "Admins can update pricing roles config" ON pricing_roles_config;
DROP POLICY IF EXISTS "Admins can delete pricing roles config" ON pricing_roles_config;

-- Create new policies that reference the users table correctly
-- Allow admins to read all pricing roles
CREATE POLICY "Admins can read pricing roles config" ON pricing_roles_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt() ->> 'email'
      AND users.role = 'admin'
    )
  );

-- Allow admins to insert pricing roles
CREATE POLICY "Admins can insert pricing roles config" ON pricing_roles_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt() ->> 'email'
      AND users.role = 'admin'
    )
  );

-- Allow admins to update pricing roles
CREATE POLICY "Admins can update pricing roles config" ON pricing_roles_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt() ->> 'email'
      AND users.role = 'admin'
    )
  );

-- Allow admins to delete pricing roles
CREATE POLICY "Admins can delete pricing roles config" ON pricing_roles_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt() ->> 'email'
      AND users.role = 'admin'
    )
  );
