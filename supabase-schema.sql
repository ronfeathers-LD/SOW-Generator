-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SOW table
CREATE TABLE IF NOT EXISTS sows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_logo TEXT DEFAULT '',
  client_name TEXT NOT NULL,
  sow_title TEXT NOT NULL,
  client_title TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  signature_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deliverables TEXT DEFAULT '',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration TEXT DEFAULT '',
  client_roles JSONB DEFAULT '[]',
  pricing_roles JSONB DEFAULT '[]',
  billing_info JSONB DEFAULT '{}',
  access_requirements TEXT DEFAULT '',
  travel_requirements TEXT DEFAULT '',
  working_hours TEXT DEFAULT '',
  testing_responsibilities TEXT DEFAULT '',
  addendums JSONB DEFAULT '[]',
  is_latest BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES sows(id),
  version INTEGER DEFAULT 1,
  leandata_email TEXT DEFAULT 'agam.vasani@leandata.com',
  leandata_name TEXT DEFAULT 'Agam Vasani',
  leandata_title TEXT DEFAULT 'VP Customer Success',
  client_signer_name TEXT DEFAULT '',
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  title TEXT NOT NULL,
  opportunity_amount DECIMAL(10,2),
  opportunity_close_date TIMESTAMP WITH TIME ZONE,
  opportunity_id TEXT,
  opportunity_name TEXT,
  opportunity_stage TEXT,
  project_description TEXT DEFAULT '',
  objectives_description TEXT DEFAULT '',
  objectives_key_objectives JSONB DEFAULT '[]',
  avoma_transcription TEXT DEFAULT '',
  avoma_url TEXT DEFAULT '',
  
  -- Project Details (existing)
  products JSONB DEFAULT '[]',
  number_of_units TEXT DEFAULT '',
  regions TEXT DEFAULT '',
  salesforce_tenants TEXT DEFAULT '',
  timeline_weeks TEXT DEFAULT '',
  project_start_date TIMESTAMP WITH TIME ZONE,
  project_end_date TIMESTAMP WITH TIME ZONE,
  units_consumption TEXT DEFAULT '',
  
  -- BookIt Family Units (new)
  orchestration_units TEXT DEFAULT '',
  bookit_forms_units TEXT DEFAULT '',
  bookit_links_units TEXT DEFAULT '',
  bookit_handoff_units TEXT DEFAULT '',
  
  -- Template data
  template JSONB DEFAULT '{}',
  
  -- Custom content fields
  custom_intro_content TEXT DEFAULT '',
  custom_scope_content TEXT DEFAULT '',
  custom_objectives_disclosure_content TEXT DEFAULT '',
  custom_assumptions_content TEXT DEFAULT '',
  custom_project_phases_content TEXT DEFAULT '',
  custom_roles_content TEXT DEFAULT '',
  custom_deliverables_content TEXT DEFAULT '',
  custom_objective_overview_content TEXT DEFAULT '',
  custom_key_objectives_content TEXT DEFAULT '',
  
  -- Content edit tracking
  intro_content_edited BOOLEAN DEFAULT false,
  scope_content_edited BOOLEAN DEFAULT false,
  objectives_disclosure_content_edited BOOLEAN DEFAULT false,
  assumptions_content_edited BOOLEAN DEFAULT false,
  project_phases_content_edited BOOLEAN DEFAULT false,
  roles_content_edited BOOLEAN DEFAULT false,
  deliverables_content_edited BOOLEAN DEFAULT false,
  objective_overview_content_edited BOOLEAN DEFAULT false,
  key_objectives_content_edited BOOLEAN DEFAULT false,
  
  -- Customer signature fields
  customer_signature_name_2 TEXT DEFAULT '',
  customer_signature_2 TEXT DEFAULT '',
  customer_email_2 TEXT DEFAULT '',
  customer_signature_date_2 TIMESTAMP WITH TIME ZONE,
  
  -- Salesforce fields
  salesforce_account_id TEXT DEFAULT ''
);

-- Create approval workflow tables
CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_comment BOOLEAN DEFAULT false,
  auto_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'amount', 'product', etc.
  condition_value TEXT NOT NULL, -- JSON string with condition details
  stage_id UUID REFERENCES approval_stages(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sow_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES approval_stages(id),
  approver_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'skipped'
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES approval_comments(id), -- For threaded comments
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default approval stages
INSERT INTO approval_stages (name, description, sort_order, requires_comment) VALUES
  ('Initial Review', 'Initial review by project manager', 1, false),
  ('Technical Review', 'Technical review by engineering lead', 2, true),
  ('Final Approval', 'Final approval by VP', 3, true)
ON CONFLICT DO NOTHING;

-- Insert default approval rules
INSERT INTO approval_rules (name, condition_type, condition_value, stage_id, sort_order) VALUES
  ('High Value Projects', 'amount', '{"min_amount": 50000}', 
   (SELECT id FROM approval_stages WHERE name = 'Final Approval'), 1)
ON CONFLICT DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Create sow_products junction table
CREATE TABLE IF NOT EXISTS sow_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(sow_id, product_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE
);

-- Create salesforce_configs table
CREATE TABLE IF NOT EXISTS salesforce_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  security_token TEXT,
  login_url TEXT DEFAULT 'https://login.salesforce.com',
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_error TEXT
);

-- Create lean_data_signatories table
CREATE TABLE IF NOT EXISTS lean_data_signatories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create avoma_configs table
CREATE TABLE IF NOT EXISTS avoma_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  api_key TEXT NOT NULL,
  api_url TEXT DEFAULT 'https://api.avoma.com',
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  customer_id TEXT
);

-- Create gemini_configs table
CREATE TABLE IF NOT EXISTS gemini_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  api_key TEXT NOT NULL,
  model_name TEXT DEFAULT 'gemini-1.5-flash',
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_error TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sows_created_at ON sows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sows_status ON sows(status);
CREATE INDEX IF NOT EXISTS idx_sows_parent_id ON sows(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_sow_id ON comments(sow_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sows_updated_at BEFORE UPDATE ON sows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salesforce_configs_updated_at BEFORE UPDATE ON salesforce_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lean_data_signatories_updated_at BEFORE UPDATE ON lean_data_signatories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avoma_configs_updated_at BEFORE UPDATE ON avoma_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gemini_configs_updated_at BEFORE UPDATE ON gemini_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_stages_updated_at BEFORE UPDATE ON approval_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_rules_updated_at BEFORE UPDATE ON approval_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_approvals_updated_at BEFORE UPDATE ON sow_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_comments_updated_at BEFORE UPDATE ON approval_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lean_data_signators ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoma_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to SOWs
CREATE POLICY "Public read access to SOWs" ON sows FOR SELECT USING (true);

-- Create policies for authenticated users
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (auth.uid()::text = id::text);
CREATE POLICY "Users can create SOWs" ON sows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update SOWs" ON sows FOR UPDATE USING (true);
CREATE POLICY "Users can delete SOWs" ON sows FOR DELETE USING (true);
CREATE POLICY "Users can manage comments" ON comments FOR ALL USING (true);

-- Admin policies for config tables
CREATE POLICY "Admin access to configs" ON salesforce_configs FOR ALL USING (true);
CREATE POLICY "Admin access to signators" ON lean_data_signators FOR ALL USING (true);
CREATE POLICY "Admin access to avoma configs" ON avoma_configs FOR ALL USING (true);
CREATE POLICY "Admin access to gemini configs" ON gemini_configs FOR ALL USING (true); 