-- Add Gemini logs table for tracking all Gemini API calls and responses
CREATE TABLE IF NOT EXISTS gemini_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  transcript_length INTEGER NOT NULL,
  prompt_content TEXT NOT NULL,
  gemini_response TEXT NOT NULL,
  parsed_result JSONB,
  error_message TEXT,
  model_used TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gemini_logs_customer_name ON gemini_logs(customer_name);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_created_at ON gemini_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_success ON gemini_logs(success);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_model_used ON gemini_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_endpoint ON gemini_logs(endpoint);

-- Add comment
COMMENT ON TABLE gemini_logs IS 'Stores detailed logs of all Gemini API calls for debugging and improving content generation';
