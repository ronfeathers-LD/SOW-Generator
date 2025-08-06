-- Add custom objective overview content columns to sows table
ALTER TABLE sows 
ADD COLUMN custom_objective_overview_content TEXT,
ADD COLUMN objective_overview_content_edited BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN sows.custom_objective_overview_content IS 'Custom objective overview content edited by user';
COMMENT ON COLUMN sows.objective_overview_content_edited IS 'Flag indicating if objective overview content has been edited'; 