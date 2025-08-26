import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
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
