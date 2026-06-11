-- Migration 029: DB hygiene (#370)
--
-- 1. Drop the broken updated_at trigger on sow_changelog.
--    001 attached update_updated_at_column() to sow_changelog, but the table
--    has no updated_at column — so EVERY UPDATE on it errors with
--    `record "new" has no field "updated_at"`. This includes the FK
--    SET NULL on parent_version_id, which makes cascade-deleting a SOW
--    referenced in another SOW's changelog fail. The table is an append-only
--    log; it does not need the trigger (and never benefited from it).
--
-- 2. Drop the legacy `comments` table.
--    Created in 001 alongside approval_comments, never used by the app
--    (the admin user-stats route was its last reader and now reads
--    approval_comments). Empty in production. Guarded: refuses to run if
--    rows exist, so it can never silently destroy data.

DROP TRIGGER IF EXISTS update_sow_changelog_updated_at ON sow_changelog;

DO $$
DECLARE
  legacy_rows bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.comments' INTO legacy_rows;
    IF legacy_rows > 0 THEN
      RAISE EXCEPTION
        'Refusing to drop public.comments: % row(s) present (expected empty legacy table)',
        legacy_rows;
    END IF;
    DROP TABLE public.comments;
  END IF;
END $$;
