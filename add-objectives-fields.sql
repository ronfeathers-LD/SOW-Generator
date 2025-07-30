-- Migration script to add objectives fields to existing SOW tables
-- Run this in your Supabase SQL editor

-- Add the new objectives fields to the sows table
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS objectives_description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS objectives_key_objectives JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS avoma_transcription TEXT DEFAULT '';

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'sows' 
AND column_name IN ('objectives_description', 'objectives_key_objectives', 'avoma_transcription')
ORDER BY column_name; 