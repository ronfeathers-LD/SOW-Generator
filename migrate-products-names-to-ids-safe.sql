-- SAFE MIGRATION: Convert product names to IDs with backup
-- This script will:
-- 1. Add a backup column
-- 2. Backup existing data
-- 3. Convert names to IDs
-- 4. Provide rollback capability

-- Step 1: Add backup column (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' 
        AND column_name = 'template_products_backup'
    ) THEN
        ALTER TABLE sows ADD COLUMN template_products_backup JSONB;
    END IF;
END $$;

-- Step 2: Backup existing product data
UPDATE sows 
SET template_products_backup = template->'products'
WHERE template ? 'products' 
AND jsonb_typeof(template->'products') = 'array'
AND jsonb_array_length(template->'products') > 0;

-- Step 3: Create function to convert product names to IDs
CREATE OR REPLACE FUNCTION convert_product_names_to_ids_safe(product_names JSONB)
RETURNS JSONB AS $$
DECLARE
    product_ids JSONB := '[]';
    product_name TEXT;
    product_id TEXT;
BEGIN
    -- Loop through each product name in the array
    FOR product_name IN SELECT jsonb_array_elements_text(product_names)
    LOOP
        -- Find the product ID for this name
        SELECT id::TEXT INTO product_id
        FROM products 
        WHERE name = product_name AND is_active = true;
        
        -- If we found a matching product, add its ID to the result
        IF product_id IS NOT NULL THEN
            product_ids := product_ids || to_jsonb(product_id);
        ELSE
            -- Log products that couldn't be found but keep the original name as fallback
            RAISE WARNING 'Product not found: %. Keeping original name as fallback.', product_name;
            product_ids := product_ids || to_jsonb(product_name);
        END IF;
    END LOOP;
    
    RETURN product_ids;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Convert product names to IDs (with fallback to names)
UPDATE sows 
SET 
    template = jsonb_set(
        template, 
        '{products}', 
        convert_product_names_to_ids_safe(template->'products')
    ),
    updated_at = NOW()
WHERE 
    template ? 'products' 
    AND jsonb_typeof(template->'products') = 'array'
    AND jsonb_array_length(template->'products') > 0;

-- Step 5: Clean up the function
DROP FUNCTION convert_product_names_to_ids_safe(JSONB);

-- Step 6: Verification queries
-- Check the results
SELECT 'MIGRATION RESULTS:' as info;
SELECT 
    id,
    template_products_backup as original_products,
    template->'products' as migrated_products,
    updated_at
FROM sows 
WHERE template_products_backup IS NOT NULL
LIMIT 10;

-- Show summary
SELECT 'MIGRATION SUMMARY:' as info;
SELECT 
    COUNT(*) as total_sows,
    COUNT(template_products_backup) as sows_with_backed_up_products,
    COUNT(CASE WHEN template->'products' IS NOT NULL AND jsonb_array_length(template->'products') > 0 THEN 1 END) as sows_with_migrated_products
FROM sows;
