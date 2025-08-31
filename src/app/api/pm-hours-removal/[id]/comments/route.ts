import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PMHoursRemovalService } from '@/lib/pm-hours-removal-service';

// POST - Add a comment to a PM hours removal request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const { comment, parentId, isInternal } = await request.json();

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    // Add the comment
    const result = await PMHoursRemovalService.addComment(
      id,
      user.id,
      comment.trim(),
      parentId,
      isInternal || false,
      supabase
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      comment: result.comment 
    });
  } catch (error) {
    console.error('Error adding comment to PM hours removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

