-- Store AI-generated content as baseline for edit detection.
-- The pre-submit checklist compares current content against these baselines
-- to ensure someone has reviewed and edited the AI output before submission.

ALTER TABLE sows ADD COLUMN IF NOT EXISTS ai_generated_scope_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS ai_generated_key_objectives_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS ai_generated_deliverables_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS ai_generated_objective_overview_content TEXT;
