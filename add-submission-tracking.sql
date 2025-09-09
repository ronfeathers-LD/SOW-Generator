-- Add submission tracking fields to sows table
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the fields
COMMENT ON COLUMN sows.submitted_by IS 'User who submitted the SOW for review';
COMMENT ON COLUMN sows.submitted_at IS 'Timestamp when the SOW was submitted for review';
