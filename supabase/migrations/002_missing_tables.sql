-- Add missing tables that the application expects

-- Create avoma_configs table
CREATE TABLE IF NOT EXISTS avoma_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  api_key TEXT NOT NULL,
  api_url TEXT DEFAULT 'https://api.avoma.com',
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_error TEXT
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

-- Create lean_data_signatories table
CREATE TABLE IF NOT EXISTS lean_data_signatories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
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

-- Create ai_prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1
);

-- Create ai_prompt_versions table
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  change_notes TEXT DEFAULT ''
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

-- Create pm_hours_removal_comments table
CREATE TABLE IF NOT EXISTS pm_hours_removal_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_id UUID REFERENCES pm_hours_removal_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE avoma_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE lean_data_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_removal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_hours_removal_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Admin access to avoma configs" ON avoma_configs FOR ALL USING (true);
CREATE POLICY "Admin access to gemini configs" ON gemini_configs FOR ALL USING (true);
CREATE POLICY "Admin access to salesforce configs" ON salesforce_configs FOR ALL USING (true);
CREATE POLICY "Admin access to slack config" ON slack_config FOR ALL USING (true);
CREATE POLICY "Admin access to lean data signatories" ON lean_data_signatories FOR ALL USING (true);
CREATE POLICY "Admin access to sow content templates" ON sow_content_templates FOR ALL USING (true);
CREATE POLICY "Admin access to ai prompts" ON ai_prompts FOR ALL USING (true);
CREATE POLICY "Admin access to ai prompt versions" ON ai_prompt_versions FOR ALL USING (true);
CREATE POLICY "Admin access to google drive configs" ON google_drive_configs FOR ALL USING (true);
CREATE POLICY "Admin access to email config" ON email_config FOR ALL USING (true);
CREATE POLICY "Users can manage pm hours removal requests" ON pm_hours_removal_requests FOR ALL USING (true);
CREATE POLICY "Users can manage pm hours removal comments" ON pm_hours_removal_comments FOR ALL USING (true);

-- Create triggers for updated_at on new tables
CREATE TRIGGER update_avoma_configs_updated_at BEFORE UPDATE ON avoma_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gemini_configs_updated_at BEFORE UPDATE ON gemini_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salesforce_configs_updated_at BEFORE UPDATE ON salesforce_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slack_config_updated_at BEFORE UPDATE ON slack_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lean_data_signatories_updated_at BEFORE UPDATE ON lean_data_signatories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_content_templates_updated_at BEFORE UPDATE ON sow_content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_drive_configs_updated_at BEFORE UPDATE ON google_drive_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_config_updated_at BEFORE UPDATE ON email_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_hours_removal_requests_updated_at BEFORE UPDATE ON pm_hours_removal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_hours_removal_comments_updated_at BEFORE UPDATE ON pm_hours_removal_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
