-- Safe migration approach: Add backup column and preserve existing data
-- This allows us to safely migrate from product names to IDs while keeping the original data

-- Step 1: Add a backup column to store the original product names
ALTER TABLE sows 
ADD COLUMN template_products_backup JSONB;

-- Step 2: Backup all existing product data to the new column
UPDATE sows 
SET template_products_backup = template->'products'
WHERE template ? 'products' 
AND jsonb_typeof(template->'products') = 'array'
AND jsonb_array_length(template->'products') > 0;

-- Step 3: Verify the backup worked
-- Run this query to check the backup:
SELECT 
    id,
    template->'products' as current_products,
    template_products_backup as backed_up_products
FROM sows 
WHERE template_products_backup IS NOT NULL
LIMIT 5;

-- Step 4: Show count of SOWs with backed up data
SELECT 
    COUNT(*) as total_sows,
    COUNT(template_products_backup) as sows_with_backed_up_products
FROM sows;
