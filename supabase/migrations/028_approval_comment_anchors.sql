-- Migration 028: Anchor + resolution columns on approval_comments (#348)
--
-- WHY: Anchored comments let a reviewer highlight text in a rendered SOW
-- section and file a comment bound to that selection. The anchoring model is
-- quote + context (W3C Web Annotation style): the section key, the exact
-- quoted text, ~30 chars of surrounding context, and character offsets into
-- the section's anchor text (see src/lib/comment-anchors.ts for the exact
-- text convention) as a re-anchoring hint.
--
-- All anchor columns are NULLABLE. A comment with a NULL anchor is exactly
-- today's general comment — zero behavior change for existing flows.

-- 1. Anchor columns
ALTER TABLE approval_comments
  -- Section key from SOW_SECTION_CONTENT_COLUMNS (src/lib/sow-content.ts),
  -- e.g. 'intro', 'scope', 'objective_overview'.
  ADD COLUMN IF NOT EXISTS section_key TEXT,
  -- The exact text the reviewer selected, as it appears in the section's
  -- anchor text (DOM textContent of the sanitized section HTML).
  ADD COLUMN IF NOT EXISTS quoted_text TEXT,
  -- ~30 chars of anchor text immediately before/after the selection.
  -- Empty string (not NULL) when the selection touches a section edge.
  ADD COLUMN IF NOT EXISTS context_prefix TEXT,
  ADD COLUMN IF NOT EXISTS context_suffix TEXT,
  -- [start_offset, end_offset) character offsets into the section's anchor
  -- text at authoring time. A HINT for re-anchoring, not authoritative —
  -- quoted_text + context win when content drifts.
  ADD COLUMN IF NOT EXISTS start_offset INTEGER,
  ADD COLUMN IF NOT EXISTS end_offset INTEGER,
  -- The sow_content_snapshots ROW for this comment's specific section (not
  -- just the submission set): the most recent snapshot of (sow_id,
  -- section_key) at comment time. Pointing at the section row gives direct
  -- access to the original section content for orphaned-anchor display; the
  -- full set remains reachable via that row's submission_id. NULL when no
  -- snapshot exists yet (comment filed before any submit-for-review), or
  -- after a snapshot purge (ON DELETE SET NULL keeps the comment alive).
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES sow_content_snapshots(id) ON DELETE SET NULL,
  -- RESERVED for future stable paragraph/block IDs (deterministic re-anchoring
  -- per block instead of whole-section text search). Unused in v1 — nothing
  -- reads or writes it yet.
  ADD COLUMN IF NOT EXISTS block_id TEXT;

-- 2. Resolution columns (top-level comments only, enforced in the API)
ALTER TABLE approval_comments
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Anchor integrity: the core quartet (section_key, quoted_text,
--    start_offset, end_offset) is all-or-none. context_prefix/context_suffix
--    are deliberately OUTSIDE the constraint: they may be empty strings when
--    the selection sits at a section edge, and are best-effort hints anyway.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'approval_comments_anchor_all_or_none'
      AND conrelid = 'approval_comments'::regclass
  ) THEN
    ALTER TABLE approval_comments
      ADD CONSTRAINT approval_comments_anchor_all_or_none CHECK (
        (
          section_key IS NULL
          AND quoted_text IS NULL
          AND start_offset IS NULL
          AND end_offset IS NULL
        ) OR (
          section_key IS NOT NULL
          AND quoted_text IS NOT NULL
          AND start_offset IS NOT NULL
          AND end_offset IS NOT NULL
        )
      );
  END IF;
END $$;

-- 4. Index for the P5 highlight pass: "all anchored comments for this SOW
--    section". Partial — general comments (the vast majority today) stay out.
CREATE INDEX IF NOT EXISTS idx_approval_comments_sow_section
  ON approval_comments(sow_id, section_key)
  WHERE section_key IS NOT NULL;
