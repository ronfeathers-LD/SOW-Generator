-- Add pricing fields to change_orders table
ALTER TABLE change_orders 
ADD COLUMN pricing_roles JSONB DEFAULT '[]',
ADD COLUMN total_change_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the pricing_roles field
COMMENT ON COLUMN change_orders.pricing_roles IS 'Array of pricing roles with hours and costs for the change order';
COMMENT ON COLUMN change_orders.total_change_amount IS 'Total monetary amount for this change order';
