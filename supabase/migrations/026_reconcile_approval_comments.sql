-- Migration 026: Reconcile approval_comments migrations with production schema (#345)
--
-- WHY: The migration files drifted from production reality.
--   * 001_initial_schema.sql creates approval_comments with a column named
--     `content`, but production's column is named `comment` (the rename was
--     applied directly in prod and never captured in a migration).
--   * Production has an `is_internal BOOLEAN DEFAULT false` column that no
--     migration ever adds.
--   * Production has sow_id and user_id as NOT NULL; 001 leaves them nullable.
--   The API (src/app/api/sow/[id]/approval-comments/route.ts) selects/inserts
--   `comment` and `is_internal`, so a fresh database built from migrations
--   cannot run the approval-comments flow at all.
--
-- Production schema observed via PostgREST introspection (2026-06-10):
--   id          uuid        NOT NULL DEFAULT uuid_generate_v4()  PK
--   created_at  timestamptz          DEFAULT now()
--   updated_at  timestamptz          DEFAULT now()
--   sow_id      uuid        NOT NULL FK -> sows.id
--   user_id     uuid        NOT NULL FK -> users.id
--   comment     text        NOT NULL
--   is_internal boolean              DEFAULT false
--   version     integer     NOT NULL DEFAULT 1
--   parent_id   uuid                 FK -> approval_comments.id
--
-- WHAT: Bring fresh-from-migrations databases in line with production.
-- This migration is a SAFE NO-OP when run against production itself:
-- every statement is guarded (column-existence checks / IF NOT EXISTS /
-- data checks before SET NOT NULL).

-- 1. Rename content -> comment (only if the old name exists and the new one doesn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'approval_comments'
      AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'approval_comments'
      AND column_name = 'comment'
  ) THEN
    ALTER TABLE approval_comments RENAME COLUMN content TO comment;
  END IF;
END $$;

-- 2. Add is_internal (exists in production, never added by any migration)
ALTER TABLE approval_comments
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- 3. Belt-and-braces for environments built only from 001 (005 normally adds these)
ALTER TABLE approval_comments
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE approval_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE;

-- 4. Match production nullability on sow_id / user_id
--    (guarded: only tighten when no NULL rows exist, so this can never fail)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM approval_comments WHERE sow_id IS NULL) THEN
    ALTER TABLE approval_comments ALTER COLUMN sow_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM approval_comments WHERE user_id IS NULL) THEN
    ALTER TABLE approval_comments ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;
