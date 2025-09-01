-- Add missing columns to pm_hours_removal_requests table
-- This migration adds the columns that the PM hours removal system expects

-- Add missing columns to pm_hours_removal_requests table
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS pm_director_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS current_pm_hours INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS requested_pm_hours INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS hours_to_remove INTEGER;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS approval_comments TEXT;
ALTER TABLE pm_hours_removal_requests ADD COLUMN IF NOT EXISTS financial_impact DECIMAL(10,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_pm_director_id ON pm_hours_removal_requests(pm_director_id);
CREATE INDEX IF NOT EXISTS idx_pm_hours_removal_requests_current_pm_hours ON pm_hours_removal_requests(current_pm_hours);
