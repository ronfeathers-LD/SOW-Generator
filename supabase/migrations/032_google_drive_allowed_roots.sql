-- Migration 032: Google Drive access allowlist (#74)
--
-- The Drive integration authenticates with a single OAuth refresh token that
-- (as connected) can read the authorizing user's entire Drive plus everything
-- shared with them — far beyond customer SOW documents. Any logged-in app user
-- can POST an arbitrary documentId to /api/google-drive/extract-content or walk
-- folders/[folderId]/contents and read/enumerate anything that token can see.
--
-- This column lets an admin pin the integration to specific folder/shared-drive
-- roots. When set, every read/list/extract/upload validates the target resource
-- is within one of these roots (see assertWithinAllowedRoots). When empty the
-- behavior is unchanged (permissive) so the feature keeps working until roots
-- are configured — the routes log a warning in that case.
--
-- NOTE: this is defense-in-depth. The durable fix is re-connecting the
-- integration as a least-privilege identity (a service/dedicated account that
-- can only see the customer-docs shared drive), tracked separately.

ALTER TABLE google_drive_configs
  ADD COLUMN IF NOT EXISTS allowed_folder_ids TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN google_drive_configs.allowed_folder_ids IS
  'Allowlist of Google Drive folder/shared-drive IDs the integration may read/list/extract/upload within. Empty = unrestricted (legacy behavior). See migration 032 / audit #74.';
