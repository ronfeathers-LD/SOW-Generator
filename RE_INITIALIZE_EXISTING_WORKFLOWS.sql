-- RE-INITIALIZE: Workflow for existing SOWs in review
-- This creates approval records for SOWs that are already in 'in_review' status

-- First, delete any existing approval records (in case they exist)
DELETE FROM sow_approvals WHERE id IN (
  SELECT sa.id 
  FROM sow_approvals sa
  INNER JOIN sows s ON sa.sow_id = s.id
  WHERE s.status = 'in_review'
);

-- Now create approval records for all SOWs in review
-- This mimics what the ApprovalWorkflowService.initiateWorkflow() does

INSERT INTO sow_approvals (sow_id, stage_id, status, created_at, updated_at)
SELECT 
  s.id as sow_id,
  stage.id as stage_id,
  CASE 
    WHEN stage.sort_order = 1 THEN 'pending'  -- First stage is pending
    ELSE 'not_started'                        -- Other stages not started yet
  END as status,
  NOW() as created_at,
  NOW() as updated_at
FROM sows s
CROSS JOIN approval_stages stage
WHERE s.status = 'in_review'
  AND stage.is_active = true
  AND stage.name IN ('Professional Services', 'Sr. Leadership')  -- Always include these
  AND NOT EXISTS (
    SELECT 1 FROM sow_approvals sa2 
    WHERE sa2.sow_id = s.id AND sa2.stage_id = stage.id
  );

-- For SOWs that meet PM hour criteria (3+ products or 100+ units), 
-- add the Project Management stage
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
  AND stage.is_active = true
  AND (
    -- Check for 3+ products (excluding BookIt Links)
    (
      SELECT COUNT(*) 
      FROM jsonb_array_elements_text(s.products) as product_id
      WHERE product_id != '511f28fa-6cc4-41f9-9234-dc45056aa2d2'
    ) >= 3
    OR
    -- Check for 100+ total units
    (
      SELECT COALESCE(SUM((value->>'units')::numeric), 0)
      FROM jsonb_array_elements(s.pricing_roles) as value
    ) >= 100
  )
  AND NOT EXISTS (
    SELECT 1 FROM sow_approvals sa 
    WHERE sa.sow_id = s.id AND sa.stage_id = stage.id
  );

-- Display the results
SELECT 
  s.id as sow_id,
  s.sow_title,
  s.status,
  COUNT(sa.id) as approval_stages_created
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title, s.status
ORDER BY s.id;

