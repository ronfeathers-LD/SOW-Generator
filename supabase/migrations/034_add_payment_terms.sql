-- 034_add_payment_terms.sql
ALTER TABLE sows ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '';
