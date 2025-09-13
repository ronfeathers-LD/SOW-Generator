-- Migration script to convert SOW template.products from product names to product IDs
-- This fixes the product brittleness issue where changing product names breaks existing SOWs

-- Step 1: Create a function to convert product names to IDs
CREATE OR REPLACE FUNCTION convert_product_names_to_ids(product_names JSONB)
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
            -- Log products that couldn't be found (for debugging)
            RAISE WARNING 'Product not found: %', product_name;
        END IF;
    END LOOP;
    
    RETURN product_ids;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update all existing SOWs to use product IDs instead of names
-- This is a safe operation that preserves existing data
UPDATE sows 
SET 
    template = jsonb_set(
        template, 
        '{products}', 
        convert_product_names_to_ids(template->'products')
    ),
    updated_at = NOW()
WHERE 
    template ? 'products' 
    AND jsonb_typeof(template->'products') = 'array'
    AND jsonb_array_length(template->'products') > 0;

-- Step 3: Clean up the temporary function
DROP FUNCTION convert_product_names_to_ids(JSONB);

-- Verification query to check the migration worked
-- Run this after the migration to verify results:
/*
SELECT 
    id,
    template->'products' as products,
    updated_at
FROM sows 
WHERE template ? 'products' 
ORDER BY updated_at DESC 
LIMIT 10;
*/
