-- ROLLBACK SCRIPT: Restore original product names from backup
-- Use this if you need to revert the migration

-- Step 1: Restore original product names from backup
UPDATE sows 
SET 
    template = jsonb_set(
        template, 
        '{products}', 
        template_products_backup
    ),
    updated_at = NOW()
WHERE template_products_backup IS NOT NULL;

-- Step 2: Verify rollback
SELECT 'ROLLBACK RESULTS:' as info;
SELECT 
    id,
    template_products_backup as backup_products,
    template->'products' as restored_products,
    updated_at
FROM sows 
WHERE template_products_backup IS NOT NULL
LIMIT 5;

-- Step 3: Show summary
SELECT 'ROLLBACK SUMMARY:' as info;
SELECT 
    COUNT(*) as total_sows,
    COUNT(template_products_backup) as sows_with_backup,
    COUNT(CASE WHEN template->'products' IS NOT NULL AND jsonb_array_length(template->'products') > 0 THEN 1 END) as sows_with_restored_products
FROM sows;
