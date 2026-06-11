-- Add account_segment field to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS account_segment TEXT DEFAULT '';

-- Create index for better performance on account_segment
CREATE INDEX IF NOT EXISTS idx_sows_account_segment ON sows(account_segment);

