-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Insert default products
INSERT INTO products (name, description, sort_order) VALUES
  ('Leads to Account Matching', 'Match leads to existing accounts', 1),
  ('Lead Routing', 'Route leads to appropriate owners', 2),
  ('Contact Routing', 'Route contacts to appropriate owners', 3),
  ('Account Routing', 'Route accounts to appropriate owners', 4),
  ('Opportunity Routing', 'Route opportunities to appropriate owners', 5),
  ('Case Routing', 'Route cases to appropriate owners', 6),
  ('Any Object (custom) Routing', 'Route any custom object to appropriate owners', 7),
  ('BookIt for Forms', 'BookIt integration for forms', 8),
  ('BookIt Links', 'BookIt link functionality', 9),
  ('BookIt Handoff (without Smartrep)', 'BookIt handoff without Smartrep integration', 10),
  ('BookIt Handoff (with Smartrep)', 'BookIt handoff with Smartrep integration', 11)
ON CONFLICT (name) DO NOTHING;

-- Create junction table for SOW products (many-to-many relationship)
CREATE TABLE IF NOT EXISTS sow_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(sow_id, product_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_products_updated_at BEFORE UPDATE ON sow_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_sow_products_sow_id ON sow_products(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_products_product_id ON sow_products(product_id); 