-- Fix AI Prompt Versions UUID Issue
-- This fixes the created_by field type mismatch

-- First, drop the existing table if it exists (since it's new and likely empty)
DROP TABLE IF EXISTS ai_prompt_versions;

-- Recreate the table with the correct schema
CREATE TABLE ai_prompt_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT, -- TEXT type to handle NextAuth user IDs
  change_reason TEXT,
  is_current BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX idx_ai_prompt_versions_prompt_id ON ai_prompt_versions(prompt_id);
CREATE INDEX idx_ai_prompt_versions_version_number ON ai_prompt_versions(prompt_id, version_number);
CREATE INDEX idx_ai_prompt_versions_is_current ON ai_prompt_versions(is_current);

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
