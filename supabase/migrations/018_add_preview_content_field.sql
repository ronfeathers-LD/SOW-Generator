-- Add preview_content field to sows table for persisting edited content from Content Preview step
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS preview_content TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN sows.preview_content IS 'Edited content from the Content Preview step of the Objectives wizard';
