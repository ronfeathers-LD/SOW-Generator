-- Add change_orders table
CREATE TABLE IF NOT EXISTS change_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reference to original SOW
  sow_id UUID REFERENCES sows(id) NOT NULL,
  
  -- Change Order Details
  change_order_number TEXT NOT NULL, -- CO#01, CO#02, etc.
  change_number INTEGER NOT NULL,    -- Sequential number (1, 2, 3...)
  change_requestor TEXT NOT NULL,     -- Who requested the change
  
  -- Change Categories (stored as JSONB array)
  change_categories JSONB DEFAULT '[]', -- ['Schedule', 'Cost', 'Scope', 'Testing (Quality)', 'Resources', 'Artifacts']
  
  -- User Input Fields
  reason_for_change TEXT NOT NULL,
  change_description TEXT NOT NULL,
  
  -- Project Details (copied from SOW)
  project_name TEXT NOT NULL,
  original_start_date DATE,
  original_end_date DATE,
  new_start_date DATE,
  new_end_date DATE,
  
  -- Signer Information (copied from SOW)
  client_signer_name TEXT NOT NULL,
  client_signer_title TEXT NOT NULL,
  client_signer_email TEXT NOT NULL,
  leandata_signer_name TEXT NOT NULL,
  leandata_signer_title TEXT NOT NULL,
  leandata_signer_email TEXT NOT NULL,
  
  -- Order Form Details
  order_form_date DATE NOT NULL,
  
  -- Additional fields from template
  associated_po TEXT DEFAULT 'N/A',
  
  -- Status and Tracking
  status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, rejected
  author_id UUID REFERENCES users(id),
  
  -- Soft delete
  is_hidden BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_change_orders_sow_id ON change_orders(sow_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_author_id ON change_orders(author_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_at ON change_orders(created_at);

-- Create unique constraint for change order numbers per SOW
CREATE UNIQUE INDEX IF NOT EXISTS idx_change_orders_sow_number ON change_orders(sow_id, change_order_number);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_change_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_change_orders_updated_at();

-- Enable Row Level Security
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to read their own change orders
CREATE POLICY "Users can view change orders for their SOWs" ON change_orders
  FOR SELECT USING (
    auth.uid() IN (
      SELECT author_id FROM change_orders WHERE id = change_orders.id
    )
  );

-- Policy for authenticated users to insert change orders
CREATE POLICY "Authenticated users can create change orders" ON change_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated users to update their own change orders
CREATE POLICY "Users can update their own change orders" ON change_orders
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT author_id FROM change_orders WHERE id = change_orders.id
    )
  );

-- Policy for authenticated users to delete their own change orders
CREATE POLICY "Users can delete their own change orders" ON change_orders
  FOR DELETE USING (
    auth.uid() IN (
      SELECT author_id FROM change_orders WHERE id = change_orders.id
    )
  );

-- Admin access policy (if needed for admin panel)
CREATE POLICY "Admin access to change orders" ON change_orders
  FOR ALL USING (true);
