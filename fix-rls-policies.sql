-- =====================================================
-- RLS Policy Fixes for SOW Generator Database
-- =====================================================
-- This file creates proper Row Level Security policies
-- BEFORE enabling RLS to prevent breaking the application
-- =====================================================

-- =====================================================
-- 1. API LOGS TABLE POLICIES
-- =====================================================

-- Policy: Authenticated users can view all API logs (for debugging/admin)
CREATE POLICY "authenticated_users_can_view_api_logs" ON public.api_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert API logs (for logging requests)
CREATE POLICY "authenticated_users_can_insert_api_logs" ON public.api_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update API logs (for error corrections)
CREATE POLICY "authenticated_users_can_update_api_logs" ON public.api_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete API logs (for cleanup)
CREATE POLICY "authenticated_users_can_delete_api_logs" ON public.api_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. SOW SALESFORCE DATA TABLE POLICIES
-- =====================================================

-- Policy: Authenticated users can view SOW Salesforce data
CREATE POLICY "authenticated_users_can_view_sow_salesforce_data" ON public.sow_salesforce_data
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert SOW Salesforce data
CREATE POLICY "authenticated_users_can_insert_sow_salesforce_data" ON public.sow_salesforce_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update SOW Salesforce data
CREATE POLICY "authenticated_users_can_update_sow_salesforce_data" ON public.sow_salesforce_data
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete SOW Salesforce data
CREATE POLICY "authenticated_users_can_delete_sow_salesforce_data" ON public.sow_salesforce_data
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. GEMINI LOGS TABLE POLICIES
-- =====================================================

-- Policy: Authenticated users can view Gemini logs
CREATE POLICY "authenticated_users_can_view_gemini_logs" ON public.gemini_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert Gemini logs
CREATE POLICY "authenticated_users_can_insert_gemini_logs" ON public.gemini_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update Gemini logs
CREATE POLICY "authenticated_users_can_update_gemini_logs" ON public.gemini_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete Gemini logs
CREATE POLICY "authenticated_users_can_delete_gemini_logs" ON public.gemini_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. AI PROMPTS TABLE POLICIES
-- =====================================================

-- Policy: Authenticated users can view AI prompts
CREATE POLICY "authenticated_users_can_view_ai_prompts" ON public.ai_prompts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert AI prompts
CREATE POLICY "authenticated_users_can_insert_ai_prompts" ON public.ai_prompts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update AI prompts
CREATE POLICY "authenticated_users_can_update_ai_prompts" ON public.ai_prompts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete AI prompts
CREATE POLICY "authenticated_users_can_delete_ai_prompts" ON public.ai_prompts
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. SLACK CONFIG TABLE POLICIES
-- =====================================================

-- Policy: Authenticated users can view Slack config
CREATE POLICY "authenticated_users_can_view_slack_config" ON public.slack_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert Slack config
CREATE POLICY "authenticated_users_can_insert_slack_config" ON public.slack_config
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update Slack config
CREATE POLICY "authenticated_users_can_update_slack_config" ON public.slack_config
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete Slack config
CREATE POLICY "authenticated_users_can_delete_slack_config" ON public.slack_config
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. ENABLE RLS ON ALL TABLES
-- =====================================================
-- Only run this AFTER confirming all policies work correctly!

-- Enable RLS on api_logs
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sow_salesforce_data
ALTER TABLE public.sow_salesforce_data ENABLE ROW LEVEL SECURITY;

-- Enable RLS on gemini_logs
ALTER TABLE public.gemini_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on slack_config
ALTER TABLE public.slack_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is working correctly

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('api_logs', 'sow_salesforce_data', 'gemini_logs', 'ai_prompts', 'slack_config')
ORDER BY tablename;

-- Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('api_logs', 'sow_salesforce_data', 'gemini_logs', 'ai_prompts', 'slack_config')
ORDER BY tablename, policyname;

-- =====================================================
-- ROLLBACK PLAN (if needed)
-- =====================================================
-- If something goes wrong, run these to disable RLS:

/*
-- Disable RLS on all tables
ALTER TABLE public.api_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sow_salesforce_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_config DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "authenticated_users_can_view_api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "authenticated_users_can_insert_api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "authenticated_users_can_update_api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "authenticated_users_can_delete_api_logs" ON public.api_logs;

DROP POLICY IF EXISTS "authenticated_users_can_view_sow_salesforce_data" ON public.sow_salesforce_data;
DROP POLICY IF EXISTS "authenticated_users_can_insert_sow_salesforce_data" ON public.sow_salesforce_data;
DROP POLICY IF EXISTS "authenticated_users_can_update_sow_salesforce_data" ON public.sow_salesforce_data;
DROP POLICY IF EXISTS "authenticated_users_can_delete_sow_salesforce_data" ON public.sow_salesforce_data;

DROP POLICY IF EXISTS "authenticated_users_can_view_gemini_logs" ON public.gemini_logs;
DROP POLICY IF EXISTS "authenticated_users_can_insert_gemini_logs" ON public.gemini_logs;
DROP POLICY IF EXISTS "authenticated_users_can_update_gemini_logs" ON public.gemini_logs;
DROP POLICY IF EXISTS "authenticated_users_can_delete_gemini_logs" ON public.gemini_logs;

DROP POLICY IF EXISTS "authenticated_users_can_view_ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "authenticated_users_can_insert_ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "authenticated_users_can_update_ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "authenticated_users_can_delete_ai_prompts" ON public.ai_prompts;

DROP POLICY IF EXISTS "authenticated_users_can_view_slack_config" ON public.slack_config;
DROP POLICY IF EXISTS "authenticated_users_can_insert_slack_config" ON public.slack_config;
DROP POLICY IF EXISTS "authenticated_users_can_update_slack_config" ON public.slack_config;
DROP POLICY IF EXISTS "authenticated_users_can_delete_slack_config" ON public.slack_config;
*/
