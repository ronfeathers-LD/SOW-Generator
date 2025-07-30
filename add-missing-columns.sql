-- Migration script to add missing columns to sows table
-- Run this in your Supabase SQL editor

-- Add avoma_transcription column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'avoma_transcription'
    ) THEN
        ALTER TABLE sows ADD COLUMN avoma_transcription TEXT DEFAULT '';
    END IF;
END $$;

-- Add any other missing columns that might be needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'objectives_description'
    ) THEN
        ALTER TABLE sows ADD COLUMN objectives_description TEXT DEFAULT '';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'objectives_key_objectives'
    ) THEN
        ALTER TABLE sows ADD COLUMN objectives_key_objectives JSONB DEFAULT '[]';
    END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sows' 
AND column_name IN ('avoma_transcription', 'objectives_description', 'objectives_key_objectives')
ORDER BY column_name; 