-- Migration 027: SOW content snapshots at submit-for-review (#347)
--
-- WHY: Anchored comments (later phases) reference text inside SOW sections.
-- When a SOW is rejected it returns to draft and edits overwrite the
-- custom_*_content columns in place, so the text a comment was anchored to
-- can disappear. Capturing a snapshot of every section's RENDERED content at
-- the moment a SOW is submitted for review lets orphaned comments show their
-- original context, enables deterministic re-anchoring, and later powers
-- "what changed since your last review" diffs.
--
-- One submit-for-review produces one "snapshot set": one row per section key
-- (see SOW_SECTION_CONTENT_COLUMNS in src/lib/sow-content.ts), all sharing a
-- submission_id so the set is addressable as a unit. Rows are append-only and
-- written exclusively by the server (service-role client) from
-- src/lib/sow-snapshot-service.ts.

CREATE TABLE IF NOT EXISTS sow_content_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  -- sows.version at capture time (revision chains share content history).
  sow_version INTEGER NOT NULL,
  -- All rows captured in a single submit-for-review share one submission_id,
  -- so a "snapshot set" can be referenced by later phases (comments link to
  -- the set they were authored against).
  submission_id UUID NOT NULL,
  -- Section key from SOW_SECTION_CONTENT_COLUMNS (e.g. 'intro', 'scope').
  section_key TEXT NOT NULL,
  -- Canonicalized HTML of the column actually RENDERED for this section key.
  -- NULL is meaningful: the section had no stored content at submit time
  -- (it was rendered from a default template or structured data instead).
  content TEXT
);

-- Indexes: latest-snapshot lookups per SOW, and per-section history.
CREATE INDEX IF NOT EXISTS idx_sow_content_snapshots_sow_id_created_at
  ON sow_content_snapshots(sow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sow_content_snapshots_sow_id_section_key
  ON sow_content_snapshots(sow_id, section_key);

-- RLS posture: mirror the append-only sow_changelog pattern from
-- 005_complete_production_schema.sql (RLS enabled + permissive SELECT/INSERT
-- policies, no UPDATE/DELETE policies — snapshots are immutable history).
-- The app only ever touches this table through the service-role client,
-- which bypasses RLS; the policies exist so the table matches the posture of
-- its neighbors rather than being left without RLS.
ALTER TABLE sow_content_snapshots ENABLE ROW LEVEL SECURITY;

-- Guarded like the rest of this migration (CREATE POLICY has no IF NOT
-- EXISTS), so re-running is a no-op — same pattern as 025's storage policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sow_content_snapshots'
      AND policyname = 'Users can view sow content snapshots'
  ) THEN
    CREATE POLICY "Users can view sow content snapshots"
      ON sow_content_snapshots FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sow_content_snapshots'
      AND policyname = 'Users can create sow content snapshots'
  ) THEN
    CREATE POLICY "Users can create sow content snapshots"
      ON sow_content_snapshots FOR INSERT WITH CHECK (true);
  END IF;
END $$;
