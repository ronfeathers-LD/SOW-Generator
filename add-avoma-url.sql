-- Add avoma_url column to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS avoma_url TEXT DEFAULT ''; 