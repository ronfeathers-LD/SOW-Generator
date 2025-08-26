import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/admin/users/[id]/slack-mapping - Get user's Slack mapping
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('slack_user_id, slack_username, slack_mapping_updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine mapping status
    let mapping_status: 'complete' | 'partial' | 'none' = 'none';
    if (user.slack_user_id && user.slack_username) {
      mapping_status = 'complete';
    } else if (user.slack_user_id || user.slack_username) {
      mapping_status = 'partial';
    }

    const mapping = {
      slack_user_id: user.slack_user_id,
      slack_username: user.slack_username,
      slack_mapping_updated_at: user.slack_mapping_updated_at,
      mapping_status
    };

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]/slack-mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id]/slack-mapping - Update user's Slack mapping
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { slack_user_id, slack_username } = await request.json();

    if (!slack_user_id || !slack_username) {
      return NextResponse.json({ 
        error: 'Both slack_user_id and slack_username are required' 
      }, { status: 400 });
    }

    // Validate Slack user ID format
    if (!slack_user_id.match(/^U[A-Z0-9]{8,}$/)) {
      return NextResponse.json({ 
        error: 'Invalid Slack user ID format. Should be like U1234567890' 
      }, { status: 400 });
    }

    // Validate Slack username format
    if (!slack_username.match(/^[a-z0-9._-]+$/)) {
      return NextResponse.json({ 
        error: 'Invalid Slack username format. Should contain only lowercase letters, numbers, dots, underscores, and hyphens' 
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Check if this Slack user is already mapped to another app user
    const { data: existingMapping, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .or(`slack_user_id.eq.${slack_user_id},slack_username.eq.${slack_username}`)
      .neq('id', id);

    if (checkError) {
      console.error('Error checking existing mapping:', checkError);
      return NextResponse.json({ error: 'Failed to check existing mapping' }, { status: 500 });
    }

    if (existingMapping && existingMapping.length > 0) {
      const conflictingUser = existingMapping[0];
      return NextResponse.json({ 
        error: `Slack user ${slack_username} is already mapped to ${conflictingUser.email}` 
      }, { status: 409 });
    }

    // Update the user's Slack mapping
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        slack_user_id,
        slack_username,
        slack_mapping_updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('slack_user_id, slack_username, slack_mapping_updated_at')
      .single();

    if (updateError) {
      console.error('Error updating Slack mapping:', updateError);
      return NextResponse.json({ error: 'Failed to update Slack mapping' }, { status: 500 });
    }

    const mapping = {
      slack_user_id: updatedUser.slack_user_id,
      slack_username: updatedUser.slack_username,
      slack_mapping_updated_at: updatedUser.slack_mapping_updated_at,
      mapping_status: 'complete' as const
    };

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]/slack-mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
