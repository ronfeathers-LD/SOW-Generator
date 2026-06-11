-- Add partner fields to sows table
ALTER TABLE sows 
ADD COLUMN isv_partner_account TEXT,
ADD COLUMN isv_partner_account_name TEXT,
ADD COLUMN implementation_partner TEXT,
ADD COLUMN channel_partner_contract_amount DECIMAL(10,2),
ADD COLUMN date_of_partner_engagement TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the partner fields
COMMENT ON COLUMN sows.isv_partner_account IS 'Salesforce ID of the ISV partner account';
COMMENT ON COLUMN sows.isv_partner_account_name IS 'Name of the ISV partner account';
COMMENT ON COLUMN sows.implementation_partner IS 'Implementation partner name';
COMMENT ON COLUMN sows.channel_partner_contract_amount IS 'Contract amount with channel partner';
COMMENT ON COLUMN sows.date_of_partner_engagement IS 'Date when partner engagement began';

