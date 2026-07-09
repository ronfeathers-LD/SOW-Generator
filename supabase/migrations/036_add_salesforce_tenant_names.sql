-- Named SFDC tenants/sandboxes for the SOW (free text; count lives in salesforce_tenants)
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_tenant_names TEXT;
