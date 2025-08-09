import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';
import { AuditService } from '@/lib/audit-service';

// GET - Fetch approval comments for a SOW
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
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
        user:users(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: true });

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

    // Sort top-level comments by creation date
    topLevelComments.sort((a, b) => {
      const aObj = a as { created_at: string };
      const bObj = b as { created_at: string };
      return new Date(aObj.created_at).getTime() - new Date(bObj.created_at).getTime();
    });

    // Debug logging
    console.log('API Response - All comments:', allComments);
    console.log('API Response - Comment map:', Array.from(commentMap.entries()));
    console.log('API Response - Top level comments:', topLevelComments);
    
    // Log each comment's threading info
    comments.forEach(comment => {
      console.log(`Comment ${comment.id}: parent_id=${comment.parent_id}, comment="${comment.comment}"`);
    });

    if (error) {
      console.error('Error fetching comments:', error);
      return new NextResponse('Failed to fetch comments', { status: 500 });
    }

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
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sowId = (await params).id;
    const { comment, parent_id } = await request.json();

    if (!comment?.trim()) {
      return new NextResponse('Comment is required', { status: 400 });
    }

    // Get the SOW to check version
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('version')
      .eq('id', sowId)
      .single();

    if (sowError || !sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Get current user
    const { data: user } = await supabase
      .from('users')
      .select('id')
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
        version: sow.version || 1
      })
      .select(`
        *,
        user:users(id, name, email)
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
      parent_id || undefined
    );

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error creating approval comment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 