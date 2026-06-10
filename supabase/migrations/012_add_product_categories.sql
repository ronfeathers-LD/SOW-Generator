-- Add category and unit requirement fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_units BOOLEAN DEFAULT false;

-- Create product_categories table for managing categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO product_categories (name, description, sort_order) VALUES
('routing', 'Routing & Orchestration products', 1),
('bookit', 'BookIt Family products', 2),
('other', 'Other products', 3)
ON CONFLICT (name) DO NOTHING;

-- Update existing products with appropriate categories based on current hardcoded logic
-- FlowBuilder products (routing category, but don't require units)
UPDATE products SET category = 'routing', requires_units = false 
WHERE id IN (
  'b1f01145-94a9-4000-9f89-59555afedf03', -- Lead FlowBuilder
  'f59381c7-40b4-4def-b83f-053a2b6e48bd', -- Contact FlowBuilder
  'a9f4cc66-5649-4ae4-a7b5-cbfe89b2ef60', -- Account FlowBuilder
  'c980026d-08e0-49da-be39-fe37c40f47c7', -- Opportunity FlowBuilder
  '5d83b73b-363b-4983-be2d-31d53058633e', -- Case FlowBuilder
  '88415274-4cb2-409c-8c01-1c37f3a122bc'  -- Any Object (custom) FlowBuilder
);

-- Lead to Account Matching (routing category, requires units)
UPDATE products SET category = 'routing', requires_units = true 
WHERE id = '4a3f2862-dbf2-4558-8b66-67701cbbee14';

-- BookIt products (bookit category, require units)
UPDATE products SET category = 'bookit', requires_units = true 
WHERE id IN (
  '6dde4839-6d67-4821-a7c7-18c227ffcc93', -- BookIt for Forms
  'dbe57330-23a9-42bc-bef2-5bbfbcef4e09', -- BookIt Links
  '159b4183-ee40-4255-a7d0-968b1482e451', -- BookIt Handoff (with Smartrep)
  '6698b269-10b0-485b-be59-ad9c3cc33368'  -- BookIt Handoff (without Smartrep)
);

-- Other products (other category, may or may not require units)
UPDATE products SET category = 'other', requires_units = false 
WHERE id = 'c417d9e5-4792-40c2-b461-b8fec985948a'; -- NotifyPlus

-- Set default category for any remaining products
UPDATE products SET category = 'other' WHERE category IS NULL;
