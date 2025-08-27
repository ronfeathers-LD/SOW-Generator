-- Add leandata_signatory_id column to sows table
-- This column will store the ID of the selected LeanData signatory

ALTER TABLE sows 
ADD COLUMN leandata_signatory_id UUID REFERENCES lean_data_signatories(id);

-- Add an index for better query performance
CREATE INDEX idx_sows_leandata_signatory_id ON sows(leandata_signatory_id);

-- Add a comment to document the column purpose
COMMENT ON COLUMN sows.leandata_signatory_id IS 'Reference to the selected LeanData signatory for this SOW';
