-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SOW table
CREATE TABLE IF NOT EXISTS sows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_logo TEXT DEFAULT '',
  client_name TEXT NOT NULL,
  client_title TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  signature_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deliverables TEXT DEFAULT '',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration TEXT DEFAULT '',
  client_roles JSONB DEFAULT '[]',
  pricing_roles JSONB DEFAULT '[]',
  billing_info JSONB DEFAULT '{}',
  addendums JSONB DEFAULT '[]',
  is_latest BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES sows(id),
  version INTEGER DEFAULT 1,
  leandata_email TEXT DEFAULT '',
  leandata_name TEXT DEFAULT '',
  leandata_title TEXT DEFAULT '',
  client_signer_name TEXT DEFAULT '',
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  opportunity_amount DECIMAL(10,2),
  opportunity_close_date TIMESTAMP WITH TIME ZONE,
  opportunity_id TEXT,
  opportunity_name TEXT,
  opportunity_stage TEXT,

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
  custom_out_of_scope_content TEXT DEFAULT '',
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
  out_of_scope_content_edited BOOLEAN DEFAULT false,
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
  
  -- Salesforce fields
  salesforce_account_id TEXT DEFAULT '',
  
  -- Author tracking
  author_id UUID REFERENCES users(id),
  
  -- Approval tracking fields
  approval_comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  
  -- Soft delete field
  is_hidden BOOLEAN DEFAULT false,
  
  -- SOW title field (renamed from title to sow_title for consistency)
  sow_title TEXT NOT NULL
);

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

-- Create approval_comments table for threaded approval discussions
CREATE TABLE IF NOT EXISTS approval_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1
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

-- Create approval_stages table
CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create sow_approvals table
CREATE TABLE IF NOT EXISTS sow_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES approval_stages(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  approver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Create approval_audit_log table for tracking approval actions
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  comments TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create sow_changelog table for tracking all SOW content changes
CREATE TABLE IF NOT EXISTS sow_changelog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id TEXT, -- Store the actual user identifier (Google OAuth ID, email, or UUID)
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'version_create'
  field_name TEXT, -- The specific field that was changed
  previous_value TEXT, -- Previous value (for text fields) or JSON string (for complex fields)
  new_value TEXT, -- New value (for text fields) or JSON string (for complex fields)
  change_type TEXT NOT NULL, -- 'field_update', 'content_edit', 'status_change', 'version_create'
  diff_summary TEXT, -- Human-readable summary of the change
  metadata JSONB DEFAULT '{}', -- Additional context like tab name, section, etc.
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES sows(id) ON DELETE SET NULL -- For versioning context
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sows_created_at ON sows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sows_status ON sows(status);
CREATE INDEX IF NOT EXISTS idx_sows_parent_id ON sows(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_sow_id ON comments(sow_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_sow_id ON sow_changelog(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_user_id ON sow_changelog(user_id);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_created_at ON sow_changelog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_field_name ON sow_changelog(field_name);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_change_type ON sow_changelog(change_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sows_updated_at') THEN
        CREATE TRIGGER update_sows_updated_at BEFORE UPDATE ON sows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN
        CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_salesforce_configs_updated_at') THEN
        CREATE TRIGGER update_salesforce_configs_updated_at BEFORE UPDATE ON salesforce_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lean_data_signatories_updated_at') THEN
        CREATE TRIGGER update_lean_data_signatories_updated_at BEFORE UPDATE ON lean_data_signatories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_avoma_configs_updated_at') THEN
        CREATE TRIGGER update_avoma_configs_updated_at BEFORE UPDATE ON avoma_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_gemini_configs_updated_at') THEN
        CREATE TRIGGER update_gemini_configs_updated_at BEFORE UPDATE ON gemini_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sow_changelog_updated_at') THEN
        CREATE TRIGGER update_sow_changelog_updated_at BEFORE UPDATE ON sow_changelog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_stages_updated_at') THEN
        CREATE TRIGGER update_approval_stages_updated_at BEFORE UPDATE ON approval_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sow_approvals_updated_at') THEN
        CREATE TRIGGER update_sow_approvals_updated_at BEFORE UPDATE ON sow_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_audit_log_updated_at') THEN
        CREATE TRIGGER update_approval_audit_log_updated_at BEFORE UPDATE ON approval_audit_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_approval_comments_updated_at') THEN
        CREATE TRIGGER update_approval_comments_updated_at BEFORE UPDATE ON approval_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

END $$;

-- Insert default approval stages
INSERT INTO approval_stages (name, description, sort_order) VALUES
  ('Legal Review', 'Legal team review and approval', 1),
  ('Finance Review', 'Finance team review and approval', 2),
  ('Executive Approval', 'Executive team final approval', 3)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lean_data_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoma_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_changelog ENABLE ROW LEVEL SECURITY;


-- Create policies for public read access to SOWs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sows' AND policyname = 'Public read access to SOWs') THEN
        CREATE POLICY "Public read access to SOWs" ON sows FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can manage their own data') THEN
        CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (auth.uid()::text = id::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sows' AND policyname = 'Users can create SOWs') THEN
        CREATE POLICY "Users can create SOWs" ON sows FOR INSERT WITH CHECK (true);
    END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sows' AND policyname = 'Users can update SOWs') THEN
        CREATE POLICY "Users can update SOWs" ON sows FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sows' AND policyname = 'Users can delete SOWs') THEN
        CREATE POLICY "Users can delete SOWs" ON sows FOR DELETE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can manage comments') THEN
        CREATE POLICY "Users can manage comments" ON comments FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salesforce_configs' AND policyname = 'Admin access to configs') THEN
        CREATE POLICY "Admin access to configs" ON salesforce_configs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lean_data_signatories' AND policyname = 'Admin access to signatories') THEN
        CREATE POLICY "Admin access to signatories" ON lean_data_signatories FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'avoma_configs' AND policyname = 'Admin access to avoma configs') THEN
        CREATE POLICY "Admin access to avoma configs" ON avoma_configs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gemini_configs' AND policyname = 'Admin access to gemini configs') THEN
        CREATE POLICY "Admin access to gemini configs" ON gemini_configs FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sow_changelog' AND policyname = 'Users can view changelog') THEN
        CREATE POLICY "Users can view changelog" ON sow_changelog FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sow_changelog' AND policyname = 'Users can create changelog entries') THEN
        CREATE POLICY "Users can create changelog entries" ON sow_changelog FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_stages' AND policyname = 'Public read access to approval stages') THEN
        CREATE POLICY "Public read access to approval stages" ON approval_stages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sow_approvals' AND policyname = 'Public read access to sow approvals') THEN
        CREATE POLICY "Public read access to sow approvals" ON sow_approvals FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_audit_log' AND policyname = 'Public read access to approval audit log') THEN
        CREATE POLICY "Public read access to approval audit log" ON approval_audit_log FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approval_comments' AND policyname = 'Public read access to approval comments') THEN
        CREATE POLICY "Public read access to approval comments" ON approval_comments FOR SELECT USING (true);
    END IF;

END $$; 