-- Add missing salesforce_contact_id field to sows table
-- This field is referenced in the code but missing from the database schema

-- Add salesforce_contact_id field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'salesforce_contact_id') THEN
        ALTER TABLE sows ADD COLUMN salesforce_contact_id TEXT DEFAULT '';
        RAISE NOTICE 'Added salesforce_contact_id column to sows table';
    ELSE
        RAISE NOTICE 'salesforce_contact_id column already exists in sows table';
    END IF;
END $$;

-- Add leandata_signatory_id field if it doesn't exist (also referenced in the API)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'leandata_signatory_id') THEN
        ALTER TABLE sows ADD COLUMN leandata_signatory_id UUID REFERENCES lean_data_signatories(id);
        RAISE NOTICE 'Added leandata_signatory_id column to sows table';
    ELSE
        RAISE NOTICE 'leandata_signatory_id column already exists in sows table';
    END IF;
END $$;

-- Add missing assumption fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'access_requirements') THEN
        ALTER TABLE sows ADD COLUMN access_requirements TEXT DEFAULT '';
        RAISE NOTICE 'Added access_requirements column to sows table';
    ELSE
        RAISE NOTICE 'access_requirements column already exists in sows table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'travel_requirements') THEN
        ALTER TABLE sows ADD COLUMN travel_requirements TEXT DEFAULT '';
        RAISE NOTICE 'Added travel_requirements column to sows table';
    ELSE
        RAISE NOTICE 'travel_requirements column already exists in sows table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'working_hours') THEN
        ALTER TABLE sows ADD COLUMN working_hours TEXT DEFAULT '';
        RAISE NOTICE 'Added working_hours column to sows table';
    ELSE
        RAISE NOTICE 'working_hours column already exists in sows table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sows' AND column_name = 'testing_responsibilities') THEN
        ALTER TABLE sows ADD COLUMN testing_responsibilities TEXT DEFAULT '';
        RAISE NOTICE 'Added testing_responsibilities column to sows table';
    ELSE
        RAISE NOTICE 'testing_responsibilities column already exists in sows table';
    END IF;
END $$;

-- Migration completed successfully
DO $$
BEGIN
    RAISE NOTICE 'Salesforce contact ID migration completed successfully!';
    RAISE NOTICE 'Added missing salesforce_contact_id, leandata_signatory_id, and assumption fields to sows table.';
END $$;
