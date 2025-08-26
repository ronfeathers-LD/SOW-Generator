import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
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

    // Initialize Google Drive service
    const driveService = new GoogleDriveService({
      clientId: driveConfig.client_id,
      clientSecret: driveConfig.client_secret,
      redirectUri: driveConfig.redirect_uri,
      refreshToken: driveConfig.refresh_token
    });

    // List root folders
    const folders = await driveService.listRootFolders();

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
