-- Add API logs table for tracking all API requests and responses
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers JSONB DEFAULT '{}',
  request_body JSONB DEFAULT '{}',
  request_query JSONB DEFAULT '{}',
  response_status INTEGER,
  response_body JSONB DEFAULT '{}',
  response_headers JSONB DEFAULT '{}',
  duration_ms INTEGER,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_method ON api_logs(method);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_status ON api_logs(response_status);

-- Add comment
COMMENT ON TABLE api_logs IS 'Stores detailed logs of all API requests and responses for debugging and audit purposes';
