-- Migration: Add BookIt Family Units to SOW table
-- This migration adds individual unit fields for each BookIt family product

-- Add BookIt Family Units columns
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS orchestration_units TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bookit_forms_units TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bookit_links_units TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bookit_handoff_units TEXT DEFAULT '';

-- Add other missing columns that might not exist
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS number_of_units TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS regions TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS salesforce_tenants TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS timeline_weeks TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS project_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS project_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS units_consumption TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS template JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_intro_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_scope_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_objectives_disclosure_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_assumptions_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_project_phases_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_roles_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_deliverables_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_objective_overview_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_key_objectives_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS intro_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scope_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS objectives_disclosure_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assumptions_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS project_phases_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS roles_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deliverables_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS objective_overview_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS key_objectives_content_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_signature_name_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_signature_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_email_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_signature_date_2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT DEFAULT '';

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_sows_orchestration_units ON sows(orchestration_units);
CREATE INDEX IF NOT EXISTS idx_sows_bookit_forms_units ON sows(bookit_forms_units);
CREATE INDEX IF NOT EXISTS idx_sows_bookit_links_units ON sows(bookit_links_units);
CREATE INDEX IF NOT EXISTS idx_sows_bookit_handoff_units ON sows(bookit_handoff_units);

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sow_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(sow_id, product_id)
);

-- Create indexes for sow_products
CREATE INDEX IF NOT EXISTS idx_sow_products_sow_id ON sow_products(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_products_product_id ON sow_products(product_id);

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_products_updated_at BEFORE UPDATE ON sow_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
