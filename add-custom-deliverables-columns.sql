-- Add custom deliverables content columns to sows table
ALTER TABLE sows 
ADD COLUMN custom_deliverables_content TEXT,
ADD COLUMN deliverables_content_edited BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN sows.custom_deliverables_content IS 'Custom deliverables content edited by user';
COMMENT ON COLUMN sows.deliverables_content_edited IS 'Flag indicating if deliverables content has been edited'; 