import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authOptions } from '@/lib/auth';

/**
 * PATCH /api/sow/[id]/approval-comments/[commentId] — resolve / unresolve a
 * comment thread (#348).
 *
 * Body: { resolved: boolean }
 *   resolved: true  → sets resolved_at = now(), resolved_by = current user
 *   resolved: false → clears both
 *
 * Rules:
 *   - Only TOP-LEVEL comments can be resolved; replies share their parent
 *     thread's resolution state (400 otherwise).
 *   - Permissions mirror the SOW-edit pattern (see tab-update/bulk-update:
 *     author or elevated role): the COMMENT author, the SOW author, or an
 *     elevated role (admin / manager / pmo) may resolve or unresolve.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sowId, commentId } = await params;

    const body = await request.json();
    if (typeof body?.resolved !== 'boolean') {
      return new NextResponse('resolved (boolean) is required', { status: 400 });
    }
    const resolved: boolean = body.resolved;

    // Get current user (id + role for the permission check)
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email!)
      .single();

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Load the comment, scoped to this SOW
    const { data: existingComment, error: commentError } = await supabase
      .from('approval_comments')
      .select('id, user_id, parent_id, resolved_at')
      .eq('id', commentId)
      .eq('sow_id', sowId)
      .single();

    if (commentError || !existingComment) {
      return new NextResponse('Comment not found', { status: 404 });
    }

    if (existingComment.parent_id) {
      return new NextResponse(
        'Only top-level comments can be resolved',
        { status: 400 }
      );
    }

    // Load the SOW for the author check
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('author_id')
      .eq('id', sowId)
      .eq('is_hidden', false)
      .single();

    if (sowError || !sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Authorization: comment author, SOW author, or elevated role.
    // (The service-role client bypasses RLS, so this object-level check is
    // the only guard — same posture as tab-update/bulk-update.)
    const elevatedRoles = ['admin', 'manager', 'pmo'];
    const isCommentAuthor = existingComment.user_id === user.id;
    const isSowAuthor = sow.author_id === user.id;
    if (!isCommentAuthor && !isSowAuthor && !elevatedRoles.includes(user.role)) {
      return new NextResponse(
        'You do not have permission to resolve this comment',
        { status: 403 }
      );
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('approval_comments')
      .update({
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('sow_id', sowId)
      .select(`
        *,
        user:users!approval_comments_user_id_fkey(id, name, email)
      `)
      .single();

    if (updateError || !updatedComment) {
      console.error('Error updating comment resolution:', updateError);
      return new NextResponse('Failed to update comment', { status: 500 });
    }

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error resolving approval comment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
