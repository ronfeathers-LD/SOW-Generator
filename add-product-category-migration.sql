-- Add product category/group field to products table
-- This will enable proper product grouping in the UI

-- Step 1: Add category column to products table
ALTER TABLE products 
ADD COLUMN category TEXT DEFAULT 'other';

-- Step 2: Add category values based on existing product names
UPDATE products 
SET category = CASE 
    WHEN name IN (
        'Lead Routing', 
        'Contact Routing', 
        'Account Routing', 
        'Opportunity Routing', 
        'Case Routing', 
        'Any Object (custom) Routing',
        'Lead to Account Matching'
    ) THEN 'routing'
    WHEN name IN (
        'BookIt for Forms',
        'BookIt Links', 
        'BookIt Handoff (with Smartrep)',
        'BookIt Handoff (without Smartrep)'
    ) THEN 'bookit'
    ELSE 'other'
END;

-- Step 3: Verify the categories were set correctly
SELECT 'PRODUCT CATEGORIES:' as info;
SELECT id, name, category, is_active 
FROM products 
ORDER BY category, name;

-- Step 4: Show category counts
SELECT 'CATEGORY COUNTS:' as info;
SELECT category, COUNT(*) as count
FROM products 
WHERE is_active = true
GROUP BY category
ORDER BY category;
