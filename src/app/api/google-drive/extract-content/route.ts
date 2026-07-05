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
    const googleDriveService = loaded.service;

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Object-level authorization: the document must be within an allowed root
    // before we return its contents to the caller. (audit #74)
    const denied = await assertDriveResourceAllowed(googleDriveService, documentId, 'extract-content');
    if (denied) return denied;

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
