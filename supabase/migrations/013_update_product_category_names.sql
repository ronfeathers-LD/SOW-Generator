-- Update product category names to match user preferences
-- This migration updates the existing category names to be more descriptive

-- Update the category names in the product_categories table
UPDATE product_categories 
SET name = 'FlowBuilder', description = 'FlowBuilder and Orchestration products'
WHERE name = 'routing';

UPDATE product_categories 
SET name = 'BookIt', description = 'BookIt Family products'
WHERE name = 'bookit';

UPDATE product_categories 
SET name = 'Other', description = 'Other products'
WHERE name = 'other';

-- Update products to use the new category names
UPDATE products 
SET category = 'FlowBuilder'
WHERE category = 'routing';

UPDATE products 
SET category = 'BookIt'
WHERE category = 'bookit';

UPDATE products 
SET category = 'Other'
WHERE category = 'other';
