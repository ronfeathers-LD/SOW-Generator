-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table first (referenced by other tables)
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

-- Create SOW table (after users table)
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
  leandata_email TEXT DEFAULT 'agam.vasani@leandata.com',
  leandata_name TEXT DEFAULT 'Agam Vasani',
  leandata_title TEXT DEFAULT 'VP Customer Success',
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
  content TEXT NOT NULL,
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE
);

-- Create sow_approvals table
CREATE TABLE IF NOT EXISTS sow_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Create approval_audit_log table
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'
);

-- Create sow_changelog table
CREATE TABLE IF NOT EXISTS sow_changelog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT DEFAULT 'update'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sows_author_id ON sows(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_sow_id ON comments(sow_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_sow_id ON sow_changelog(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_user_id ON sow_changelog(user_id);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_created_at ON sow_changelog(created_at);
CREATE INDEX IF NOT EXISTS idx_sow_changelog_field_name ON sow_changelog(field_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_sows_updated_at BEFORE UPDATE ON sows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_comments_updated_at BEFORE UPDATE ON approval_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO users (email, name, role) VALUES 
  ('admin@leandata.com', 'Admin User', 'admin'),
  ('user@leandata.com', 'Regular User', 'user'),
  ('manager@leandata.com', 'Manager User', 'manager')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions to the application user (using postgres user for local development)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
