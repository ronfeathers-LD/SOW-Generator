-- Add PM Hours Removal columns to SOW table
-- This migration adds the missing columns that the PM hours removal system expects

-- Add PM hours removal tracking to sows table
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removed INTEGER DEFAULT 0;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_approved BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_removal_date TIMESTAMP WITH TIME ZONE;

-- Add toggle to disable PM hours requirement entirely
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_requester_id UUID REFERENCES users(id);
ALTER TABLE sows ADD COLUMN IF NOT EXISTS pm_hours_requirement_disabled_approver_id UUID REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sows_pm_hours_requirement_disabled ON sows(pm_hours_requirement_disabled);
CREATE INDEX IF NOT EXISTS idx_sows_pm_hours_removal_approved ON sows(pm_hours_removal_approved);
