-- Add assumptions content template
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('assumptions', 'Assumptions Section', 'The following are the assumptions as part of the SOW:

• LeanData Professional Services will require access to the customer''s SFDC''s sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.

• For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.

• If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.

• All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.

• Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations.', 3, 'Default assumptions text for all SOWs')
ON CONFLICT (section_name) DO NOTHING;

-- Add columns to SOW table to track custom assumptions content
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_assumptions_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS assumptions_content_edited BOOLEAN DEFAULT false; 