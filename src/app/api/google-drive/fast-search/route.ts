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

    const { query, folderName, parentFolderId } = await request.json();

    if (!query && !folderName) {
      return NextResponse.json(
        { error: 'Query or folder name is required' },
        { status: 400 }
      );
    }

    // If the caller targets a specific folder, it must be within an allowed
    // root. (audit #74)
    if (parentFolderId) {
      const denied = await assertDriveResourceAllowed(driveService, parentFolderId, 'fast-search:parentFolder');
      if (denied) return denied;
    }

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

