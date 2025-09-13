-- Add missing products that exist in SOWs but not in products table
-- This ensures all products referenced in SOWs exist in the products table

-- Step 1: Add Lead Flowbuilder (if it doesn't exist)
INSERT INTO products (name, description, category, is_active, sort_order)
SELECT 'Lead Flowbuilder', 'Lead Flowbuilder product', 'other', true, 999
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = 'Lead Flowbuilder'
);

-- Step 2: Verify all products exist
SELECT 'ALL PRODUCTS AFTER ADDING MISSING:' as info;
SELECT id, name, category, is_active 
FROM products 
ORDER BY category, name;

-- Step 3: Check if any SOW products still don't exist in products table
SELECT 'REMAINING MISSING PRODUCTS:' as info;
SELECT DISTINCT 
    sow_product_name,
    CASE 
        WHEN p.name IS NULL THEN 'STILL MISSING'
        ELSE 'NOW EXISTS'
    END as status
FROM (
    SELECT DISTINCT jsonb_array_elements_text(products) as sow_product_name
    FROM sows 
    WHERE products IS NOT NULL 
    AND jsonb_array_length(products) > 0
) sow_products
LEFT JOIN products p ON p.name = sow_product_name
WHERE p.name IS NULL
ORDER BY sow_product_name;
