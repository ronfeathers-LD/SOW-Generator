-- Add custom key objectives content columns to sows table
ALTER TABLE sows
ADD COLUMN custom_key_objectives_content TEXT,
ADD COLUMN key_objectives_content_edited BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN sows.custom_key_objectives_content IS 'Custom key objectives content edited by user';
COMMENT ON COLUMN sows.key_objectives_content_edited IS 'Flag indicating if key objectives content has been edited'; 