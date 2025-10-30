-- Fix: Initialize missing workflows for SOWs already in review
-- Run this to create approval workflow records for SOWs that were submitted before the workflow code was added

-- Step 1: Check what we have
SELECT 
  s.id as sow_id,
  s.sow_title,
  s.status,
  COUNT(sa.id) as existing_approval_records
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title, s.status;

-- Step 2: Create missing approval records for ALL SOWs in review
-- This will add Professional Services and Sr. Leadership stages for all SOWs in review

INSERT INTO sow_approvals (sow_id, stage_id, status, created_at, updated_at)
SELECT 
  s.id as sow_id,
  stage.id as stage_id,
  CASE 
    WHEN stage.sort_order = 1 THEN 'pending'  -- First stage is pending
    ELSE 'not_started'                          -- Other stages not started yet
  END as status,
  NOW() as created_at,
  NOW() as updated_at
FROM sows s
CROSS JOIN approval_stages stage
WHERE s.status = 'in_review'
  AND stage.is_active = true
  AND stage.name IN ('Professional Services', 'Sr. Leadership')
  AND NOT EXISTS (
    SELECT 1 FROM sow_approvals sa
    WHERE sa.sow_id = s.id AND sa.stage_id = stage.id
  );

-- Step 3: Show the results
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

