import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { loadDriveService } from '@/lib/google-drive-guard';

export async function GET() {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const supabase = await createServerSupabaseClient();

    const loaded = await loadDriveService(supabase);
    if ('error' in loaded) return loaded.error;
    const driveService = loaded.service;

    // List entry folders — restricted to the allowed roots when an allowlist
    // is configured, otherwise the account's Drive root folders. (audit #74)
    const folders = await driveService.listEntryFolders();

    return NextResponse.json({
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        mimeType: folder.mimeType,
        createdTime: folder.createdTime,
        modifiedTime: folder.modifiedTime
      }))
    });

  } catch (error) {
    console.error('Error listing Google Drive folders:', error);
    return NextResponse.json(
      { error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}
