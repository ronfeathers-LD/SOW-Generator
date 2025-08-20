-- =====================================================
-- RLS FIX - STEP BY STEP APPROACH
-- =====================================================
-- This approach is SAFER and won't break your app
-- Run each section separately and verify before proceeding
-- =====================================================

-- =====================================================
-- STEP 1: CREATE POLICIES FIRST (SAFE - won't break anything)
-- =====================================================

-- 1.1 API Logs Policies
CREATE POLICY "authenticated_users_can_view_api_logs" ON public.api_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_api_logs" ON public.api_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_api_logs" ON public.api_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_api_logs" ON public.api_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- 1.2 SOW Salesforce Data Policies
CREATE POLICY "authenticated_users_can_view_sow_salesforce_data" ON public.sow_salesforce_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_sow_salesforce_data" ON public.sow_salesforce_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_sow_salesforce_data" ON public.sow_salesforce_data
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_sow_salesforce_data" ON public.sow_salesforce_data
    FOR DELETE USING (auth.role() = 'authenticated');

-- 1.3 Gemini Logs Policies
CREATE POLICY "authenticated_users_can_view_gemini_logs" ON public.gemini_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_gemini_logs" ON public.gemini_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_gemini_logs" ON public.gemini_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_gemini_logs" ON public.gemini_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- 1.4 AI Prompts Policies
CREATE POLICY "authenticated_users_can_view_ai_prompts" ON public.ai_prompts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_ai_prompts" ON public.ai_prompts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_ai_prompts" ON public.ai_prompts
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_ai_prompts" ON public.ai_prompts
    FOR DELETE USING (auth.role() = 'authenticated');

-- 1.5 Slack Config Policies
CREATE POLICY "authenticated_users_can_view_slack_config" ON public.slack_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_slack_config" ON public.slack_config
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_slack_config" ON public.slack_config
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_slack_config" ON public.slack_config
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- STEP 2: VERIFY POLICIES WERE CREATED (SAFE)
-- =====================================================
-- Run this to confirm all policies exist before enabling RLS

SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('api_logs', 'sow_salesforce_data', 'gemini_logs', 'ai_prompts', 'slack_config')
ORDER BY tablename, policyname;

-- You should see 20 policies (4 per table)
-- If you see fewer than 20, DO NOT proceed to step 3

-- =====================================================
-- STEP 3: TEST YOUR APP (SAFE - policies don't affect anything yet)
-- =====================================================
-- 1. Test all your app functionality
-- 2. Make sure API calls work
-- 3. Test admin functions
-- 4. Test logging functionality
-- 5. Test Slack integration
-- 6. Test AI prompts
-- 7. Test Salesforce integration

-- If anything breaks, the policies are the issue - fix them before proceeding

-- =====================================================
-- STEP 4: ENABLE RLS ON ONE TABLE AT A TIME (TEST EACH)
-- =====================================================

-- 4.1 Enable RLS on api_logs first
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Test your app again - specifically API logging functionality
-- If it works, proceed to next table

-- 4.2 Enable RLS on sow_salesforce_data
ALTER TABLE public.sow_salesforce_data ENABLE ROW LEVEL SECURITY;

-- Test Salesforce integration

-- 4.3 Enable RLS on gemini_logs
ALTER TABLE public.gemini_logs ENABLE ROW LEVEL SECURITY;

-- Test Gemini functionality

-- 4.4 Enable RLS on ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Test AI prompts functionality

-- 4.5 Enable RLS on slack_config
ALTER TABLE public.slack_config ENABLE ROW LEVEL SECURITY;

-- Test Slack integration

-- =====================================================
-- STEP 5: FINAL VERIFICATION (SAFE)
-- =====================================================

-- Check that RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('api_logs', 'sow_salesforce_data', 'gemini_logs', 'ai_prompts', 'slack_config')
ORDER BY tablename;

-- All should show 't' (true) for rowsecurity

-- =====================================================
-- EMERGENCY ROLLBACK (if anything breaks)
-- =====================================================
-- Run this immediately if your app stops working:

/*
-- Disable RLS on all tables (immediate fix)
ALTER TABLE public.api_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sow_salesforce_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_config DISABLE ROW LEVEL SECURITY;

-- This will restore your app to working state
-- Then investigate which policy is causing issues
*/
