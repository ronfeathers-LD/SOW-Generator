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

    const { query, folderName, parentFolderId } = await request.json();

    if (!query && !folderName) {
      return NextResponse.json(
        { error: 'Query or folder name is required' },
        { status: 400 }
      );
    }

    // Initialize Google Drive service WITHOUT Gemini for faster results
    const driveService = new GoogleDriveService({
      clientId: driveConfig.client_id,
      clientSecret: driveConfig.client_secret,
      redirectUri: driveConfig.redirect_uri,
      refreshToken: driveConfig.refresh_token
    });

    // Use direct search without AI for immediate results
    const searchResults = await driveService.searchFolders({
      query: query || '',
      folderName,
      parentFolderId,
      maxResults: 20 // Smaller limit for faster results
    });

    return NextResponse.json({
      success: true,
      searchResults,
      interpretedQuery: { query: query || '', folderName },
      analysis: undefined,
      isFastSearch: true
    });

  } catch (error) {
    console.error('Error in Google Drive fast search:', error);
    
    let errorMessage = 'Failed to search Google Drive';
    let errorDetails = 'Check the server logs for more information.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error patterns
      if (error.message.includes('authentication') || 
          error.message.includes('unauthorized') ||
          error.message.includes('permission')) {
        errorDetails = 'Authentication or permission issue. Please check your Google Drive access.';
      } else if (error.message.includes('quota') || 
                 error.message.includes('rate limit')) {
        errorDetails = 'API quota exceeded. Please try again later.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

