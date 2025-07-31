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
  avoma_url TEXT DEFAULT ''
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Create lean_data_signators table
CREATE TABLE IF NOT EXISTS lean_data_signators (
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
CREATE TRIGGER update_lean_data_signators_updated_at BEFORE UPDATE ON lean_data_signators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avoma_configs_updated_at BEFORE UPDATE ON avoma_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gemini_configs_updated_at BEFORE UPDATE ON gemini_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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