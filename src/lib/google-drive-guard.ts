import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GoogleDriveService } from '@/lib/google-drive';

/**
 * Shared loading + authorization helpers for the Google Drive API routes.
 *
 * Centralizes (1) building a GoogleDriveService from the active
 * google_drive_configs row — including the access allowlist (audit #74) — and
 * (2) the object-level authorization check every read/list/extract/upload path
 * must apply so a caller cannot reach an arbitrary Drive resource.
 */

interface DriveConfigRow {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  refresh_token?: string;
  allowed_folder_ids?: string[] | null;
}

export type LoadDriveResult =
  | { error: NextResponse }
  | { service: GoogleDriveService; allowlistConfigured: boolean };

/**
 * Load the active Drive config and return a configured service. Returns a 400
 * NextResponse when the integration isn't configured.
 */
export async function loadDriveService(supabase: SupabaseClient): Promise<LoadDriveResult> {
  const { data: driveConfig, error } = await supabase
    .from('google_drive_configs')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !driveConfig) {
    return {
      error: NextResponse.json(
        {
          error: 'Google Drive integration is not configured',
          details: 'Please configure Google Drive in the admin panel first.',
        },
        { status: 400 }
      ),
    };
  }

  const cfg = driveConfig as DriveConfigRow;
  const allowedFolderIds = Array.isArray(cfg.allowed_folder_ids) ? cfg.allowed_folder_ids : [];

  const service = new GoogleDriveService({
    clientId: cfg.client_id,
    clientSecret: cfg.client_secret,
    redirectUri: cfg.redirect_uri,
    refreshToken: cfg.refresh_token,
    allowedFolderIds,
  });

  return { service, allowlistConfigured: allowedFolderIds.length > 0 };
}

/**
 * Object-level authorization: 403 unless `resourceId` is within the configured
 * allowed roots. When no allowlist is configured the request is permitted
 * (legacy behavior) but a warning is logged so the gap is visible in logs until
 * an admin pins the roots. Returns null when access is allowed. (audit #74)
 */
export async function assertDriveResourceAllowed(
  service: GoogleDriveService,
  resourceId: string,
  context: string
): Promise<NextResponse | null> {
  if (!service.hasAccessAllowlist()) {
    console.warn(
      `[gdrive] No access allowlist configured — ${context} for "${resourceId}" served unrestricted. Set google_drive_configs.allowed_folder_ids (audit #74).`
    );
    return null;
  }

  const allowed = await service.isWithinAllowedRoots(resourceId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'This Google Drive resource is outside the folders this integration is allowed to access.' },
      { status: 403 }
    );
  }
  return null;
}
