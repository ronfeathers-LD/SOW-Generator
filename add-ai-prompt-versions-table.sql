-- Add AI Prompt Version Control
-- This migration adds versioning capabilities to AI prompts

-- Create the ai_prompt_versions table
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT, -- Changed from UUID to TEXT to handle NextAuth user IDs
  change_reason TEXT,
  is_current BOOLEAN DEFAULT false
);

-- Add version tracking to existing ai_prompts table
ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt_id ON ai_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_version_number ON ai_prompt_versions(prompt_id, version_number);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_is_current ON ai_prompt_versions(is_current);

-- Enable RLS on the new table
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_prompt_versions
CREATE POLICY "authenticated_users_can_view_ai_prompt_versions" ON public.ai_prompt_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_ai_prompt_versions" ON public.ai_prompt_versions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_ai_prompt_versions" ON public.ai_prompt_versions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_ai_prompt_versions" ON public.ai_prompt_versions
  FOR DELETE USING (auth.role() = 'authenticated');
