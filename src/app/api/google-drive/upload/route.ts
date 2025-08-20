import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get Google Drive configuration
    const { data: driveConfig, error: configError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !driveConfig) {
      return NextResponse.json(
        { 
          error: 'Google Drive integration is not configured',
          details: 'Please configure Google Drive in the admin panel first.'
        },
        { status: 400 }
      );
    }

    const { folderId, fileName, fileType, fileContent } = await request.json();

    if (!folderId || !fileName) {
      return NextResponse.json(
        { error: 'Folder ID and file name are required' },
        { status: 400 }
      );
    }

    // Initialize Google Drive service
    const driveService = new GoogleDriveService({
      clientId: driveConfig.client_id,
      clientSecret: driveConfig.client_secret,
      redirectUri: driveConfig.redirect_uri,
      refreshToken: driveConfig.refresh_token
    });

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
