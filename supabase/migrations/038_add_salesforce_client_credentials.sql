-- Salesforce OAuth 2.0 client credentials flow (Connected App consumer key/secret).
-- Integration-license users cannot get a security token, so the password login
-- stays the default and client_credentials is opt-in per config row.
-- For client_credentials rows, `username` stores the run-as user as a label only.
ALTER TABLE salesforce_configs ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'password';
ALTER TABLE salesforce_configs ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE salesforce_configs ADD COLUMN IF NOT EXISTS client_secret TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salesforce_configs_auth_method_check'
  ) THEN
    ALTER TABLE salesforce_configs
      ADD CONSTRAINT salesforce_configs_auth_method_check
      CHECK (auth_method IN ('password', 'client_credentials'));
  END IF;
END $$;

-- client_credentials rows have no password
ALTER TABLE salesforce_configs ALTER COLUMN password DROP NOT NULL;
