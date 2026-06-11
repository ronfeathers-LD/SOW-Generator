import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AuditService } from '@/lib/audit-service';
import { SlackMentionService } from '@/lib/slack-mention-service';
import { authOptions } from '@/lib/auth';
import {
  parseAnchorInput,
  renderedSectionText,
  validateAnchorAgainstText,
} from '@/lib/comment-anchors';
import { SOW_SECTION_RENDERED_COLUMNS } from '@/lib/sow-content';
import { resolveRenderedClientName } from '@/lib/sow-client-name';

// GET - Fetch approval comments for a SOW
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sowId = (await params).id;

    // Fetch all comments for this SOW
    const { data: allComments, error } = await supabase
      .from('approval_comments')
      .select(`
        id,
        sow_id,
        user_id,
        comment,
        is_internal,
        parent_id,
        version,
        created_at,
        updated_at,
        section_key,
        quoted_text,
        context_prefix,
        context_suffix,
        start_offset,
        end_offset,
        block_id,
        snapshot_id,
        resolved_at,
        resolved_by,
        user:users!approval_comments_user_id_fkey(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return new NextResponse('Failed to fetch comments', { status: 500 });
    }

    // Organize comments into a threaded structure
    const comments = allComments || [];
    const commentMap = new Map();
    const topLevelComments: unknown[] = [];

    // First pass: create a map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into threads
    comments.forEach(comment => {
      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentMap.get(comment.id));
      }
    });

    // Sort top-level comments by creation date (newest first)
    topLevelComments.sort((a, b) => {
      const aComment = a as { created_at: string };
      const bComment = b as { created_at: string };
      return new Date(bComment.created_at).getTime() - new Date(aComment.created_at).getTime();
    });

    return NextResponse.json(topLevelComments);
  } catch (error) {
    console.error('Error fetching approval comments:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Add a new approval comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sowId = (await params).id;
    const { comment, parent_id, anchor } = await request.json();

    if (!comment?.trim()) {
      return new NextResponse('Comment is required', { status: 400 });
    }

    // Replies live inside their parent's thread and inherit its anchor
    // context — they must NOT carry an anchor of their own. REJECTED (not
    // silently ignored) so a buggy client fails loudly instead of dropping
    // anchor data on the floor.
    if (parent_id && anchor !== undefined && anchor !== null) {
      return new NextResponse('Replies cannot carry an anchor', { status: 400 });
    }

    // Validate anchor shape before touching the database.
    let parsedAnchor = null;
    if (anchor !== undefined && anchor !== null) {
      const parsed = parseAnchorInput(anchor);
      if (!parsed.ok) {
        return new NextResponse(`Invalid anchor: ${parsed.error}`, { status: 400 });
      }
      parsedAnchor = parsed.anchor;
    }

    // Get the SOW to check version and get details for Slack notifications.
    // For anchored comments, also fetch the column actually RENDERED for the
    // anchored section (SOW_SECTION_RENDERED_COLUMNS) to validate the quote.
    const anchoredColumn = parsedAnchor
      ? SOW_SECTION_RENDERED_COLUMNS[parsedAnchor.section_key]
      : null;
    const sowColumns = ['version', 'sow_title', 'client_name', 'salesforce_account_id'];
    if (anchoredColumn && !sowColumns.includes(anchoredColumn)) {
      sowColumns.push(anchoredColumn);
    }
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select(sowColumns.join(', '))
      .eq('id', sowId)
      .eq('is_hidden', false)
      .single<Record<string, unknown> & {
        version: number | null;
        sow_title: string;
        client_name: string;
      }>();

    if (sowError || !sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Validate the anchor against the section's current content AS RENDERED
    // (#351): the client captured the anchor against the rendered DOM, so we
    // validate against renderedSectionText — the stored column run through the
    // section's render transform chain (e.g. the intro's {clientName}
    // substitution, processContent for plain-text content) — not the raw
    // column. The quoted text must exist in the section at the moment the
    // comment is filed; offsets are only a hint and are corrected here if
    // they drifted.
    let snapshotId: string | null = null;
    if (parsedAnchor && anchoredColumn) {
      // Only the intro substitutes the client name; skip the lookup otherwise.
      const clientName =
        parsedAnchor.section_key === 'intro'
          ? await resolveRenderedClientName(supabase, sowId, sow)
          : '';
      const result = validateAnchorAgainstText(
        parsedAnchor,
        renderedSectionText(sow, parsedAnchor.section_key, { clientName })
      );
      if (result.status === 'not_found') {
        return new NextResponse(
          `Anchor validation failed for section "${parsedAnchor.section_key}": ${result.reason}. ` +
            'The selected text must exist in the section content when the comment is filed.',
          { status: 422 }
        );
      }
      if (result.status === 'adjusted') {
        parsedAnchor = {
          ...parsedAnchor,
          start_offset: result.start_offset,
          end_offset: result.end_offset,
        };
      }

      // Link the most recent snapshot ROW for this (sow, section) so the
      // comment keeps direct access to the content it was authored against.
      // NULL is legitimate: the SOW may never have been submitted for review.
      const { data: snapshot, error: snapshotError } = await supabase
        .from('sow_content_snapshots')
        .select('id')
        .eq('sow_id', sowId)
        .eq('section_key', parsedAnchor.section_key)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (snapshotError) {
        // Non-fatal: the anchor itself is already validated; just log.
        console.error('Error looking up content snapshot for anchor:', snapshotError);
      }
      snapshotId = snapshot?.id ?? null;
    }

    // Get current user
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', session.user.email!)
      .single();

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // If this is a reply, verify the parent comment exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('approval_comments')
        .select('id')
        .eq('id', parent_id)
        .eq('sow_id', sowId)
        .single();

      if (parentError || !parentComment) {
        return new NextResponse('Parent comment not found', { status: 404 });
      }
    }

    // Create the comment
    const { data: newComment, error: insertError } = await supabase
      .from('approval_comments')
      .insert({
        sow_id: sowId,
        user_id: user.id,
        comment: comment.trim(),
        is_internal: false,
        parent_id: parent_id || null,
        version: sow.version || 1,
        // Anchor fields: all null for general comments (zero behavior change).
        section_key: parsedAnchor?.section_key ?? null,
        quoted_text: parsedAnchor?.quoted_text ?? null,
        context_prefix: parsedAnchor?.context_prefix ?? null,
        context_suffix: parsedAnchor?.context_suffix ?? null,
        start_offset: parsedAnchor?.start_offset ?? null,
        end_offset: parsedAnchor?.end_offset ?? null,
        snapshot_id: snapshotId
      })
      .select(`
        *,
        user:users!approval_comments_user_id_fkey(id, name, email)
      `)
      .single();

    if (insertError) {
      console.error('Error creating comment:', insertError);
      return new NextResponse('Failed to create comment', { status: 500 });
    }

    // Log comment addition to audit trail
    await AuditService.logCommentAdded(
      sowId,
      user.id,
      comment.trim(),
      false,
      parent_id || undefined,
      parsedAnchor ? { section_key: parsedAnchor.section_key } : undefined
    );

    // Send Slack notifications for @mentions (if any)
    try {
      const commentAuthor = user.name || user.email || 'Unknown User';
      await SlackMentionService.sendMentionNotifications(
        comment.trim(),
        sowId,
        sow.sow_title,
        sow.client_name,
        commentAuthor,
        parsedAnchor?.quoted_text
      );
    } catch (mentionError) {
      console.error('Error sending mention notifications:', mentionError);
      // Don't fail the comment creation if mention notifications fail
    }

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error creating approval comment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 