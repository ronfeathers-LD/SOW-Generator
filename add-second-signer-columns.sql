-- Add second signer columns to sows table
ALTER TABLE sows 
ADD COLUMN customer_signature_name_2 TEXT,
ADD COLUMN customer_signature_2 TEXT,
ADD COLUMN customer_email_2 TEXT,
ADD COLUMN customer_signature_date_2 TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN sows.customer_signature_name_2 IS 'Second customer signer name (optional)';
COMMENT ON COLUMN sows.customer_signature_2 IS 'Second customer signer title (optional)';
COMMENT ON COLUMN sows.customer_email_2 IS 'Second customer signer email (optional)';
COMMENT ON COLUMN sows.customer_signature_date_2 IS 'Second customer signer signature date (optional)'; 