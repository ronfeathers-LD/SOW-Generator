import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GoogleDriveService } from '@/lib/google-drive';

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

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Initialize Google Drive service with configuration
    const googleDriveService = new GoogleDriveService({
      clientId: driveConfig.client_id,
      clientSecret: driveConfig.client_secret,
      redirectUri: driveConfig.redirect_uri,
      refreshToken: driveConfig.refresh_token
    });
    
    const result = await googleDriveService.extractDocumentContent(documentId);

    return NextResponse.json({ 
      content: result.content,
      wasTruncated: result.wasTruncated
    });
  } catch (error) {
    console.error('Error extracting document content:', error);
    return NextResponse.json(
      { error: 'Failed to extract document content' },
      { status: 500 }
    );
  }
}
