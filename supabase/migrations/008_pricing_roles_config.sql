-- Create pricing_roles_config table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS pricing_roles_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name VARCHAR(255) NOT NULL UNIQUE,
  default_rate DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add audit columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_roles_config' AND column_name = 'created_by') THEN
        ALTER TABLE pricing_roles_config ADD COLUMN created_by VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_roles_config' AND column_name = 'updated_by') THEN
        ALTER TABLE pricing_roles_config ADD COLUMN updated_by VARCHAR(255);
    END IF;
END $$;

-- Insert default pricing roles
INSERT INTO pricing_roles_config (role_name, default_rate, is_active, created_by) VALUES
  ('Onboarding Specialist', 250.00, true, 'system'),
  ('Project Manager', 250.00, true, 'system'),
  ('Technical Lead', 300.00, true, 'system'),
  ('Developer', 200.00, true, 'system'),
  ('QA Engineer', 180.00, true, 'system')
ON CONFLICT (role_name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_pricing_roles_config_updated_at 
  BEFORE UPDATE ON pricing_roles_config 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE pricing_roles_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all pricing roles
CREATE POLICY "Admins can read pricing roles config" ON pricing_roles_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to insert pricing roles
CREATE POLICY "Admins can insert pricing roles config" ON pricing_roles_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to update pricing roles
CREATE POLICY "Admins can update pricing roles config" ON pricing_roles_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow admins to delete pricing roles
CREATE POLICY "Admins can delete pricing roles config" ON pricing_roles_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
