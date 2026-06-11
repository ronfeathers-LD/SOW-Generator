-- Add missing approval_stages table that is referenced by approval_rules
-- This table was missing from the schema but is referenced by other tables

CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_comment BOOLEAN DEFAULT false,
  auto_approve BOOLEAN DEFAULT false,
  assigned_user_id UUID REFERENCES users(id),
  assigned_role TEXT
);

-- Enable RLS
ALTER TABLE approval_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for approval_stages
CREATE POLICY "Admin access to approval stages" ON approval_stages FOR ALL USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_approval_stages_updated_at 
  BEFORE UPDATE ON approval_stages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
