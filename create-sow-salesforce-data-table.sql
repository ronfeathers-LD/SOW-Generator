-- Migration: Create SOW Salesforce Data table
-- This table stores detailed Salesforce information as JSONB for flexibility

-- Create the sow_salesforce_data table
CREATE TABLE sow_salesforce_data (
  sow_id UUID PRIMARY KEY REFERENCES sows(id) ON DELETE CASCADE,
  account_data JSONB,
  contacts_data JSONB,
  opportunity_data JSONB,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_sow_salesforce_data_account ON sow_salesforce_data USING GIN (account_data);
CREATE INDEX idx_sow_salesforce_data_contacts ON sow_salesforce_data USING GIN (contacts_data);
CREATE INDEX idx_sow_salesforce_data_opportunity ON sow_salesforce_data USING GIN (opportunity_data);

-- Add comments to document the structure
COMMENT ON TABLE sow_salesforce_data IS 'Stores detailed Salesforce information for SOWs in JSONB format for flexibility';
COMMENT ON COLUMN sow_salesforce_data.account_data IS 'JSONB object containing Salesforce account details';
COMMENT ON COLUMN sow_salesforce_data.contacts_data IS 'JSONB array containing Salesforce contact details for POCs';
COMMENT ON COLUMN sow_salesforce_data.opportunity_data IS 'JSONB object containing Salesforce opportunity details';
COMMENT ON COLUMN sow_salesforce_data.last_synced_at IS 'Timestamp of last sync with Salesforce';

-- Example JSONB structure for account_data:
-- {
--   "id": "001XXXXXXXXXXXXXXX",
--   "name": "Hula Truck",
--   "website": "https://hulatruck.com",
--   "type": "Customer",
--   "owner": "Jane Doe",
--   "billing_address": {
--     "street": "123 Main St",
--     "city": "San Francisco",
--     "state": "CA",
--     "postal_code": "94105",
--     "country": "USA"
--   },
--   "industry": "Transportation",
--   "phone": "555-123-4567",
--   "selected_at": "2024-06-10T15:00:00Z"
-- }

-- Example JSONB structure for contacts_data:
-- [
--   {
--     "id": "003XXXXXXXXXXXXXXX",
--     "first_name": "Mike",
--     "last_name": "Big Trouble",
--     "email": "mike@hulatruck.com",
--     "title": "Senior Manager",
--     "role": "primary_poc",
--     "selected_at": "2024-06-10T15:05:00Z"
--   },
--   {
--     "id": "003YYYYYYYYYYYYYYY",
--     "first_name": "Sarah",
--     "last_name": "Johnson",
--     "email": "sarah@hulatruck.com",
--     "title": "Finance Manager",
--     "role": "billing_contact",
--     "selected_at": "2024-06-10T15:10:00Z"
--   }
-- ]

-- Example JSONB structure for opportunity_data:
-- {
--   "id": "006XXXXXXXXXXXXXXX",
--   "name": "Hula Truck Implementation",
--   "amount": 50000,
--   "stage_name": "Closed Won",
--   "close_date": "2024-06-15",
--   "description": "Implementation project for Hula Truck",
--   "selected_at": "2024-06-10T15:15:00Z"
-- } 