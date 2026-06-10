-- Complete Production Schema Migration
-- This migration adds all missing tables and columns from production

-- Add missing columns to existing tables

-- Add missing columns to approval_audit_log
ALTER TABLE approval_audit_log ADD COLUMN IF NOT EXISTS approval_id UUID;
ALTER TABLE approval_audit_log ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add missing columns to approval_comments
ALTER TABLE approval_comments ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE approval_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES approval_comments(id);

-- Add missing columns to approval_stages
ALTER TABLE approval_stages ADD COLUMN IF NOT EXISTS requires_comment BOOLEAN DEFAULT false;
ALTER TABLE approval_stages ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;
ALTER TABLE approval_stages ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id);
ALTER TABLE approval_stages ADD COLUMN IF NOT EXISTS assigned_role TEXT;

-- Create missing tables

-- Create api_logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB DEFAULT '{}'::jsonb,
  request_query JSONB DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body JSONB DEFAULT '{}'::jsonb,
  response_headers JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create approval_rules table
CREATE TABLE IF NOT EXISTS approval_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES approval_stages(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create avoma_recordings table
CREATE TABLE IF NOT EXISTS avoma_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  transcription TEXT,
  title TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_config table
CREATE TABLE IF NOT EXISTS email_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provider TEXT NOT NULL DEFAULT 'gmail',
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  api_key TEXT,
  from_email TEXT,
  from_name TEXT DEFAULT 'SOW Generator',
  is_active BOOLEAN DEFAULT true
);

-- Create gemini_logs table
CREATE TABLE IF NOT EXISTS gemini_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt TEXT NOT NULL,
  response TEXT,
  model_name TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  user_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create google_drive_configs table
CREATE TABLE IF NOT EXISTS google_drive_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create lean_data_signatories table (if not exists)
CREATE TABLE IF NOT EXISTS lean_data_signatories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create pm_hours_removal_comments table
CREATE TABLE IF NOT EXISTS pm_hours_removal_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_id UUID REFERENCES pm_hours_removal_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL
);

-- Create pm_hours_removal_requests table
CREATE TABLE IF NOT EXISTS pm_hours_removal_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Create salesforce_configs table (if not exists)
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

-- Create slack_config table
CREATE TABLE IF NOT EXISTS slack_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  webhook_url TEXT NOT NULL,
  channel TEXT DEFAULT '#general',
  username TEXT DEFAULT 'SOW Generator',
  icon_emoji TEXT DEFAULT ':memo:',
  bot_token TEXT,
  workspace_domain TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create slack_user_mappings table
CREATE TABLE IF NOT EXISTS slack_user_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  slack_user_id TEXT NOT NULL,
  slack_username TEXT,
  slack_email TEXT,
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true
);

-- Add stage_id column to existing sow_approvals table
ALTER TABLE sow_approvals ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES approval_stages(id) ON DELETE CASCADE;

-- Create sow_changelog table (if not exists)
CREATE TABLE IF NOT EXISTS sow_changelog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  user_id TEXT,
  action TEXT NOT NULL,
  field_name TEXT,
  previous_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL,
  diff_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES sows(id) ON DELETE SET NULL
);

-- Create sow_content_templates table
CREATE TABLE IF NOT EXISTS sow_content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Create sow_products junction table (if not exists)
CREATE TABLE IF NOT EXISTS sow_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(sow_id, product_id)
);

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoma_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lean_data_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_removal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_removal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables only (policies for existing tables are in 002_missing_tables.sql)
CREATE POLICY "Admin access to api logs" ON api_logs FOR ALL USING (true);
CREATE POLICY "Admin access to approval rules" ON approval_rules FOR ALL USING (true);
CREATE POLICY "Users can manage avoma recordings" ON avoma_recordings FOR ALL USING (true);
CREATE POLICY "Admin access to gemini logs" ON gemini_logs FOR ALL USING (true);
CREATE POLICY "Admin access to slack user mappings" ON slack_user_mappings FOR ALL USING (true);
CREATE POLICY "Public read access to sow approvals" ON sow_approvals FOR SELECT USING (true);
CREATE POLICY "Users can view changelog" ON sow_changelog FOR SELECT USING (true);
CREATE POLICY "Users can create changelog entries" ON sow_changelog FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can manage sow products" ON sow_products FOR ALL USING (true);
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (true);

-- Create triggers for updated_at on new tables only (triggers for existing tables are in 002_missing_tables.sql)
CREATE TRIGGER update_api_logs_updated_at BEFORE UPDATE ON api_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_rules_updated_at BEFORE UPDATE ON approval_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avoma_recordings_updated_at BEFORE UPDATE ON avoma_recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gemini_logs_updated_at BEFORE UPDATE ON gemini_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slack_user_mappings_updated_at BEFORE UPDATE ON slack_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_approvals_updated_at BEFORE UPDATE ON sow_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_changelog_updated_at BEFORE UPDATE ON sow_changelog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_rules_stage_id ON approval_rules(stage_id);
CREATE INDEX IF NOT EXISTS idx_approval_rules_is_active ON approval_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_avoma_recordings_sow_id ON avoma_recordings(sow_id);
CREATE INDEX IF NOT EXISTS idx_avoma_recordings_date ON avoma_recordings(date DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_created_at ON gemini_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_user_id ON gemini_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_sow_id ON pm_hours_removal_requests(sow_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_status ON pm_hours_removal_requests(status);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_slack_user_id ON slack_user_mappings(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_user_id ON slack_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_sow_approvals_sow_id ON sow_approvals(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_approvals_stage_id ON sow_approvals(stage_id);
CREATE INDEX IF NOT EXISTS idx_sow_products_sow_id ON sow_products(sow_id);
CREATE INDEX IF NOT EXISTS idx_sow_products_product_id ON sow_products(product_id);
