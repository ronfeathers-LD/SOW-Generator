-- Fix function search_path security warnings
-- Sets search_path to prevent search path injection attacks
-- This is a security best practice to prevent search_path manipulation

-- Recreate update_updated_at_column with search_path set
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Recreate update_change_orders_updated_at with search_path set
CREATE OR REPLACE FUNCTION update_change_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix other functions using ALTER FUNCTION
-- We use a DO block to conditionally fix functions that may exist

DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Loop through all functions that don't have a fixed search_path
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'update_pricing_roles_config_updated_at',
            'update_avoma_recordings_updated_at',
            'validate_approval_workflow',
            'log_approval_change',
            'get_approval_stats',
            'log_workflow_start',
            'get_slack_mapping_stats',
            'bulk_update_slack_mappings',
            'manual_update_slack_mapping',
            'update_slack_mapping',
            'prevent_security_definer_views'
        )
    LOOP
        -- Set search_path for each function
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public',
            func_record.schema_name,
            func_record.function_name,
            func_record.args
        );
        
        RAISE NOTICE 'Fixed search_path for function: %.%(%)',
            func_record.schema_name,
            func_record.function_name,
            func_record.args;
    END LOOP;
END $$;

