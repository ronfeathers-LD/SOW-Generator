-- Manually initialize workflow for a SOW in review
-- This recreates the approval workflow if it failed to initialize

-- First, delete any existing approval records
DELETE FROM sow_approvals WHERE id IN (
  SELECT sa.id 
  FROM sow_approvals sa
  INNER JOIN sows s ON sa.sow_id = s.id
  WHERE s.status = 'in_review'
);

-- Create approval records for Professional Services and Sr. Leadership (always required)
INSERT INTO sow_approvals (sow_id, stage_id, status, created_at, updated_at)
SELECT 
  s.id as sow_id,
  stage.id as stage_id,
  CASE 
    WHEN stage.sort_order = 1 THEN 'pending'
    ELSE 'not_started'
  END as status,
  NOW() as created_at,
  NOW() as updated_at
FROM sows s
CROSS JOIN approval_stages stage
WHERE s.status = 'in_review'
  AND stage.is_active = true
  AND stage.name IN ('Professional Services', 'Sr. Leadership');

-- Add Project Management stage if applicable
-- Note: This uses simplified logic - adjust criteria as needed
INSERT INTO sow_approvals (sow_id, stage_id, status, created_at, updated_at)
SELECT 
  s.id as sow_id,
  stage.id as stage_id,
  'not_started' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM sows s
CROSS JOIN approval_stages stage
WHERE s.status = 'in_review'
  AND stage.name = 'Project Management'
  AND stage.is_active = true;

-- Show what was created
SELECT 
  s.id as sow_id,
  s.sow_title,
  ast.name as stage_name,
  ast.sort_order,
  sa.status as approval_status
FROM sows s
JOIN sow_approvals sa ON sa.sow_id = s.id
JOIN approval_stages ast ON ast.id = sa.stage_id
WHERE s.status = 'in_review'
ORDER BY s.id, ast.sort_order;

