-- Test: Check what the workflow API would return for this SOW
-- This simulates what getWorkflowStatus() does

SELECT 
  s.id as sow_id,
  s.sow_title,
  s.status,
  COUNT(sa.id) as approval_records_count,
  array_agg(
    jsonb_build_object(
      'stage', ast.name,
      'status', sa.status
    )
  ) as approval_details
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
LEFT JOIN approval_stages ast ON ast.id = sa.stage_id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title, s.status;

