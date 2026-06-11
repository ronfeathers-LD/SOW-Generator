-- Add account owner fields to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_account_owner_name TEXT DEFAULT '';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_account_owner_email TEXT DEFAULT '';
