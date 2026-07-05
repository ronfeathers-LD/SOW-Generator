import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { loadDriveService, assertDriveResourceAllowed } from '@/lib/google-drive-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const { folderId } = await params;
    const supabase = await createServerSupabaseClient();

    const loaded = await loadDriveService(supabase);
    if ('error' in loaded) return loaded.error;
    const driveService = loaded.service;

    // Object-level authorization: only enumerate folders within an allowed
    // root. (audit #74)
    const denied = await assertDriveResourceAllowed(driveService, folderId, 'folder-contents');
    if (denied) return denied;

    // Get folder info and contents
    const result = await driveService.getFolderContents(folderId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error getting folder contents:', error);
    return NextResponse.json(
      { error: 'Failed to get folder contents' },
      { status: 500 }
    );
  }
}
