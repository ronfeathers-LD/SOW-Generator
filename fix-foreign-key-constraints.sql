-- Fix Foreign Key Constraint Names for PM Hours Removal Comments
-- This migration fixes the foreign key constraint names that are causing the relationship errors

-- Check if the old constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'pm_hours_comments_user_id_fkey' 
               AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments DROP CONSTRAINT pm_hours_comments_user_id_fkey;
    END IF;
END $$;

-- Check if the old constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'pm_hours_comments_request_id_fkey' 
               AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments DROP CONSTRAINT pm_hours_comments_request_id_fkey;
    END IF;
END $$;

-- Check if the old constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'pm_hours_comments_parent_id_fkey' 
               AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments DROP CONSTRAINT pm_hours_comments_parent_id_fkey;
    END IF;
END $$;

-- Add the correct foreign key constraints with proper names
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'pm_hours_removal_comments_user_id_fkey' 
                   AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments 
        ADD CONSTRAINT pm_hours_removal_comments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'pm_hours_removal_comments_request_id_fkey' 
                   AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments 
        ADD CONSTRAINT pm_hours_removal_comments_request_id_fkey 
        FOREIGN KEY (request_id) REFERENCES pm_hours_removal_requests(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'pm_hours_removal_comments_parent_id_fkey' 
                   AND table_name = 'pm_hours_removal_comments') THEN
        ALTER TABLE pm_hours_removal_comments 
        ADD CONSTRAINT pm_hours_removal_comments_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES pm_hours_removal_comments(id) ON DELETE CASCADE;
    END IF;
END $$;
