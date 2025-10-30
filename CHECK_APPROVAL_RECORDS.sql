-- Check if approval workflow records exist for SOWs in review
-- This helps diagnose the "0 of 0 stages" issue

SELECT 
  s.id as sow_id,
  s.sow_title,
  s.status,
  COUNT(sa.id) as approval_records_count,
  array_agg(
    jsonb_build_object(
      'approval_id', sa.id,
      'stage_name', ast.name,
      'status', sa.status
    )
  ) as approvals
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
LEFT JOIN approval_stages ast ON ast.id = sa.stage_id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title, s.status
ORDER BY s.created_at DESC;

-- If approval_records_count is 0 for your SOW, run the second part of RUN_THIS_TO_FIX_APPROVAL_STAGES.sql

