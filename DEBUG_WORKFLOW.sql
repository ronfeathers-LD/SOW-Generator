-- Debug: Check why workflow isn't showing
-- Find the SOW ID and check its data

-- Get SOWs in review
SELECT 
  s.id,
  s.sow_title,
  s.status,
  s.products,
  s.pricing_roles,
  s.pm_hours_requirement_disabled,
  jsonb_array_length(s.products) as product_count,
  jsonb_array_length(s.pricing_roles) as role_count
FROM sows s
WHERE s.status = 'in_review'
ORDER BY s.created_at DESC;

-- Check for approval records
SELECT 
  s.id as sow_id,
  s.sow_title,
  COUNT(sa.id) as approval_count,
  array_agg(ast.name ORDER BY ast.sort_order) as stages
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
LEFT JOIN approval_stages ast ON ast.id = sa.stage_id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title;

