-- Allow service role to bypass RLS for pricing_roles_config
-- This is necessary for server-side operations that use the service role key

-- Create a policy that allows service role (which has no JWT) to perform all operations
CREATE POLICY "Service role can access pricing roles config" ON pricing_roles_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
