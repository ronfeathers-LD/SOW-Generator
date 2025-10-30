-- Test inserting an approval record manually
-- This will help us identify the exact error

-- First, get the SOW ID and stage IDs
SELECT 
  s.id as sow_id,
  s.sow_title,
  s.status,
  s.products,
  jsonb_array_length(s.products) as product_count,
  jsonb_array_length(s.pricing_roles) as role_count
FROM sows s
WHERE s.status = 'in_review'
ORDER BY s.created_at DESC
LIMIT 5;

-- Get the stage IDs we want to use
SELECT id, name, sort_order, is_active
FROM approval_stages
WHERE is_active = true
ORDER BY sort_order;

-- Try to insert a test approval record
-- Replace the IDs with actual values from the queries above
-- Example:
/*
INSERT INTO sow_approvals (sow_id, stage_id, status, comments, approver_id, approved_at, rejected_at)
VALUES (
  'YOUR_SOW_ID_HERE',  -- from first query
  'YOUR_STAGE_ID_HERE', -- from second query
  'pending',
  NULL,
  NULL,
  NULL,
  NULL
);
*/

-- Check if insert was successful
SELECT 
  sa.*,
  ast.name as stage_name,
  s.sow_title
FROM sow_approvals sa
JOIN approval_stages ast ON ast.id = sa.stage_id
JOIN sows s ON s.id = sa.sow_id
WHERE sa.sow_id = (SELECT id FROM sows WHERE status = 'in_review' LIMIT 1);

