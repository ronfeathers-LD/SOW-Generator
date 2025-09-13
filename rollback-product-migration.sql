-- ROLLBACK SCRIPT - Convert product IDs back to product names
-- This will restore the original product names in SOW template.products

-- Step 1: Create a function to convert product IDs back to names
CREATE OR REPLACE FUNCTION convert_product_ids_to_names(product_ids JSONB)
RETURNS JSONB AS $$
DECLARE
    product_names JSONB := '[]';
    product_id TEXT;
    product_name TEXT;
BEGIN
    -- Loop through each product ID in the array
    FOR product_id IN SELECT jsonb_array_elements_text(product_ids)
    LOOP
        -- Find the product name for this ID
        SELECT name INTO product_name
        FROM products 
        WHERE id::TEXT = product_id AND is_active = true;
        
        -- If we found a matching product, add its name to the result
        IF product_name IS NOT NULL THEN
            product_names := product_names || to_jsonb(product_name);
        ELSE
            -- Log products that couldn't be found (for debugging)
            RAISE WARNING 'Product ID not found: %', product_id;
        END IF;
    END LOOP;
    
    RETURN product_names;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Check what we're working with first
-- Run this to see the current state:
SELECT 
    id,
    template->'products' as current_products,
    updated_at
FROM sows 
WHERE template ? 'products' 
ORDER BY updated_at DESC 
LIMIT 5;
