-- Migration: Add Salesforce Account ID to SOWs table
-- This allows us to link SOWs to Salesforce accounts without storing all account data

-- Add the salesforce_account_id column to the sows table
ALTER TABLE sows 
ADD COLUMN salesforce_account_id VARCHAR(32);

-- Add an index for better query performance
CREATE INDEX idx_sows_salesforce_account_id ON sows(salesforce_account_id);

-- Add a comment to document the field
COMMENT ON COLUMN sows.salesforce_account_id IS 'Salesforce Account ID (18-character unique identifier) for linking to Salesforce account records'; 