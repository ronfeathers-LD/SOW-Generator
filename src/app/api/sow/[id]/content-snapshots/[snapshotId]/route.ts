import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authOptions } from '@/lib/auth';
import { htmlToAnchorText } from '@/lib/comment-anchors';

/**
 * GET /api/sow/[id]/content-snapshots/[snapshotId] — one content snapshot row
 * (#351), used by the Comments tab to show an orphaned anchored comment's
 * ORIGINAL surrounding text.
 *
 * Returns { id, section_key, created_at, content, anchor_text } where
 * `anchor_text` is htmlToAnchorText(content): computed HERE so the client
 * gets the exact server-side anchor-text convention without shipping
 * isomorphic-dompurify's jsdom; the client does only pure string slicing
 * (src/lib/orphan-context.ts).
 *
 * Auth mirrors the approval-comments GET: any signed-in user. The row is
 * scoped to the SOW in the path so a snapshot id can't be read across SOWs.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sowId, snapshotId } = await params;

    const { data: snapshot, error } = await supabase
      .from('sow_content_snapshots')
      .select('id, section_key, content, created_at')
      .eq('id', snapshotId)
      .eq('sow_id', sowId)
      .single();

    if (error || !snapshot) {
      return new NextResponse('Snapshot not found', { status: 404 });
    }

    return NextResponse.json({
      id: snapshot.id,
      section_key: snapshot.section_key,
      created_at: snapshot.created_at,
      // NULL content is legitimate: the section rendered from defaults at
      // submit time (see sow-snapshot-service.ts). anchor_text is '' then.
      content: snapshot.content,
      anchor_text: htmlToAnchorText(snapshot.content),
    });
  } catch (error) {
    console.error('Error fetching content snapshot:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
