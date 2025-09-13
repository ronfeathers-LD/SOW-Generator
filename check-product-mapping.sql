-- Check what products exist in the database and what's in the SOWs
-- This will help us understand the mapping between names and IDs

-- 1. Show all products in the products table
SELECT 'PRODUCTS TABLE:' as info;
SELECT id, name, is_active FROM products ORDER BY name;

-- 2. Show sample of what's in SOW template.products
SELECT 'SOW PRODUCTS (sample):' as info;
SELECT id, template->'products' as products 
FROM sows 
WHERE template ? 'products' 
AND jsonb_array_length(template->'products') > 0
LIMIT 5;

-- 3. Show all unique product names found in SOWs
SELECT 'UNIQUE PRODUCT NAMES IN SOWS:' as info;
SELECT DISTINCT product_name
FROM sows, 
     jsonb_array_elements_text(template->'products') as product_name
WHERE template ? 'products'
ORDER BY product_name;
