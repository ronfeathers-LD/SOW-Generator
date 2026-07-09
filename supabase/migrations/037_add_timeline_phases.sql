-- supabase/migrations/037_add_timeline_phases.sql
-- Structured, editable project-timeline phases for the phase-bar visual (P4b).
-- NULLABLE, NO DEFAULT on purpose: existing rows read back NULL so the visual
-- falls back to the computed six-phase default derived from timeline_weeks.
-- Distinct from the rich-text `custom_project_phases_content` section (different feature).
ALTER TABLE sows ADD COLUMN IF NOT EXISTS timeline_phases JSONB;

COMMENT ON COLUMN sows.timeline_phases IS
  'Structured project-timeline phases [{name,description,startWeek,durationWeeks}] for the phase-bar visual (P4b). NULL = use computed default from timeline_weeks. Not the same as custom_project_phases_content (rich-text section 3).';
