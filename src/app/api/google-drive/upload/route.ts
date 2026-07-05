import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { loadDriveService, assertDriveResourceAllowed } from '@/lib/google-drive-guard';

export async function POST(request: NextRequest) {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const supabase = await createServerSupabaseClient();

    const loaded = await loadDriveService(supabase);
    if ('error' in loaded) return loaded.error;
    const driveService = loaded.service;

    const { folderId, fileName, fileType, fileContent } = await request.json();

    if (!folderId || !fileName) {
      return NextResponse.json(
        { error: 'Folder ID and file name are required' },
        { status: 400 }
      );
    }

    // Object-level authorization: only write into an allowed destination
    // folder. (audit #74)
    const denied = await assertDriveResourceAllowed(driveService, folderId, 'upload');
    if (denied) return denied;

    // Upload file to Google Drive
    const uploadResult = await driveService.uploadFile({
      folderId,
      fileName,
      fileType: fileType || 'application/pdf',
      fileContent: fileContent || null
    });

    return NextResponse.json({
      success: true,
      fileId: uploadResult.id,
      fileName: uploadResult.name,
      webViewLink: uploadResult.webViewLink,
      message: 'File uploaded successfully to Google Drive'
    });

  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload to Google Drive',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
