-- Add missing customer_id column to avoma_configs table
ALTER TABLE avoma_configs ADD COLUMN IF NOT EXISTS customer_id TEXT;
