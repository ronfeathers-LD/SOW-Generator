-- Fix Lead Flowbuilder references to use Lead Routing instead
-- This updates SOWs that have "Lead Flowbuilder" to use "Lead Routing"

-- Step 1: Update SOWs that contain "Lead Flowbuilder" to use "Lead Routing" instead
UPDATE sows 
SET 
    products = (
        SELECT jsonb_agg(
            CASE 
                WHEN value::text = '"Lead Flowbuilder"' THEN '"Lead Routing"'::jsonb
                ELSE value
            END
        )
        FROM jsonb_array_elements(products) AS value
    ),
    updated_at = NOW()
WHERE products::text LIKE '%Lead Flowbuilder%';

-- Step 2: Verify the changes
SELECT 'UPDATED SOWs:' as info;
SELECT 
    id,
    products_backup as original_products,
    products as updated_products
FROM sows 
WHERE products_backup::text LIKE '%Lead Flowbuilder%'
OR products::text LIKE '%Lead Routing%'
LIMIT 5;

-- Step 3: Show count of changes
SELECT 'CHANGE SUMMARY:' as info;
SELECT 
    COUNT(CASE WHEN products_backup::text LIKE '%Lead Flowbuilder%' THEN 1 END) as sows_with_lead_flowbuilder_backup,
    COUNT(CASE WHEN products::text LIKE '%Lead Routing%' THEN 1 END) as sows_with_lead_routing_now
FROM sows;
