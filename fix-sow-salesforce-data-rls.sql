-- Fix RLS policies for sow_salesforce_data table

-- Enable RLS on sow_salesforce_data table
ALTER TABLE sow_salesforce_data ENABLE ROW LEVEL SECURITY;

-- Create policies for sow_salesforce_data table
CREATE POLICY "Users can view sow_salesforce_data" ON sow_salesforce_data 
FOR SELECT USING (true);

CREATE POLICY "Users can insert sow_salesforce_data" ON sow_salesforce_data 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update sow_salesforce_data" ON sow_salesforce_data 
FOR UPDATE USING (true);

CREATE POLICY "Users can delete sow_salesforce_data" ON sow_salesforce_data 
FOR DELETE USING (true);

-- Add comment explaining the policies
COMMENT ON TABLE sow_salesforce_data IS 'Stores Salesforce account, contact, and opportunity data for SOWs';
