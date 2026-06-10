-- Add wizard data fields to sows table for persisting Google Drive documents and Avoma meetings selections
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS selected_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selected_meetings JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN sows.selected_documents IS 'Google Drive documents selected in the Objectives wizard';
COMMENT ON COLUMN sows.selected_meetings IS 'Avoma meetings selected in the Objectives wizard';






