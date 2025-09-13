-- Check what products exist and what's in the SOWs
-- This will help us create the proper migration mapping

-- 1. Show all products in the products table
SELECT 'PRODUCTS TABLE:' as info;
SELECT id, name, is_active FROM products ORDER BY name;

-- 2. Show sample of what's in SOW template.products (current format)
SELECT 'SOW PRODUCTS (current):' as info;
SELECT id, template->'products' as products 
FROM sows 
WHERE template ? 'products' 
AND jsonb_array_length(template->'products') > 0
LIMIT 10;

-- 3. Show all unique product names found in SOWs
SELECT 'UNIQUE PRODUCT NAMES IN SOWS:' as info;
SELECT DISTINCT product_name, COUNT(*) as count
FROM sows, 
     jsonb_array_elements_text(template->'products') as product_name
WHERE template ? 'products'
GROUP BY product_name
ORDER BY count DESC, product_name;

-- 4. Show products that might not match exactly
SELECT 'POTENTIAL MISMATCHES:' as info;
SELECT DISTINCT 
    sow_product_name,
    CASE 
        WHEN p.name IS NULL THEN 'NOT FOUND IN PRODUCTS TABLE'
        ELSE 'FOUND: ' || p.name
    END as status,
    p.id as product_id
FROM (
    SELECT DISTINCT jsonb_array_elements_text(template->'products') as sow_product_name
    FROM sows 
    WHERE template ? 'products'
) sow_products
LEFT JOIN products p ON p.name = sow_product_name
ORDER BY status, sow_product_name;
