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

    // Get Gemini configuration for AI-powered search
    const { data: geminiConfig, error: geminiError } = await supabase
      .from('gemini_configs')
      .select('api_key, model_name, is_active')
      .eq('is_active', true)
      .single();

    if (geminiError || !geminiConfig?.api_key) {
      return NextResponse.json(
        { 
          error: 'Gemini integration is not configured',
          details: 'Google Drive search with AI requires Gemini to be configured.'
        },
        { status: 400 }
      );
    }

    const { query, folderName, parentFolderId, useAI = true } = await request.json();

    if (!query && !folderName) {
      return NextResponse.json(
        { error: 'Query or folder name is required' },
        { status: 400 }
      );
    }

    // Initialize Google Drive service with Gemini integration
    const driveService = new GoogleDriveService(
      {
        clientId: driveConfig.client_id,
        clientSecret: driveConfig.client_secret,
        redirectUri: driveConfig.redirect_uri,
        refreshToken: driveConfig.refresh_token
      },
      useAI ? geminiConfig.api_key : undefined
    );

    let result;

    if (useAI) {
      // Use AI-powered intelligent search
      result = await driveService.intelligentFolderSearch(query || folderName || '');
    } else {
      // Use direct search without AI
      const searchResults = await driveService.searchFolders({
        query: query || '',
        folderName,
        parentFolderId,
        maxResults: 50
      });

      result = {
        searchResults,
        interpretedQuery: { query: query || '', folderName },
        analysis: undefined
      };
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error in Google Drive search:', error);
    
    let errorMessage = 'Failed to search Google Drive';
    let errorDetails = 'Check the server logs for more information.';
    let needsReauth = false;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error patterns that indicate authentication/permission issues
      if (error.message.includes('authentication') || 
          error.message.includes('No access') ||
          error.message.includes('refresh token') ||
          error.message.includes('API key') ||
          error.message.includes('permission') ||
          error.message.includes('insufficient') ||
          error.message.includes('403') ||
          error.message.includes('401')) {
        errorDetails = 'Google Drive authentication failed or permissions are insufficient. Please re-authenticate in the admin panel.';
        needsReauth = true;
      } else if (error.message.includes('quota')) {
        errorDetails = 'Google Drive API quota exceeded. Please try again later.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorDetails = 'Network error connecting to Google Drive. Please check your internet connection and try again.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        needsReauth,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const folderName = searchParams.get('folderName');
    const parentFolderId = searchParams.get('parentFolderId');

    if (!folderName) {
      return NextResponse.json(
        { error: 'Folder name is required' },
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

    // Check if folder exists
    const exists = await driveService.folderExists(folderName, parentFolderId || undefined);

    return NextResponse.json({
      success: true,
      folderName,
      parentFolderId,
      exists,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking folder existence:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check folder existence',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
