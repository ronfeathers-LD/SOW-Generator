import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/admin/users/[id]/stats - Get user activity statistics
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
    
    // Get user's email for cross-table queries
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get SOWs created by this user
    const { count: sowsCreated } = await supabase
      .from('sows')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', id)
      .eq('is_hidden', false);

    // Get SOWs edited by this user (approximate - based on changelog)
    const { count: sowsEdited } = await supabase
      .from('sow_changelog')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    // Get comments posted by this user
    const { count: commentsPosted } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    // Get approval comments posted by this user
    const { count: approvalComments } = await supabase
      .from('approval_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    // Get last activity (most recent action across all tables)
    const lastActivityQueries = [
      supabase.from('sows').select('created_at').eq('created_by', id).order('created_at', { ascending: false }).limit(1),
      supabase.from('sow_changelog').select('created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(1),
      supabase.from('comments').select('created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(1),
      supabase.from('approval_comments').select('created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(1)
    ];

    const lastActivityResults = await Promise.all(lastActivityQueries);
    const lastActivityDates = lastActivityResults
      .map(result => result.data?.[0]?.created_at)
      .filter(Boolean)
      .map(date => new Date(date));

    const lastActivity = lastActivityDates.length > 0 
      ? new Date(Math.max(...lastActivityDates.map(d => d.getTime()))).toISOString()
      : null;

    // Get total sessions (approximate - based on unique days with activity)
    const { data: sessionDays } = await supabase
      .from('sow_changelog')
      .select('created_at')
      .eq('user_id', id)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()); // Last year

    const uniqueDays = new Set(
      sessionDays?.map(entry => new Date(entry.created_at).toDateString()) || []
    );
    const totalSessions = uniqueDays.size;

    const stats = {
      sows_created: sowsCreated || 0,
      sows_edited: sowsEdited || 0,
      comments_posted: commentsPosted || 0,
      approval_comments: approvalComments || 0,
      last_activity: lastActivity,
      total_sessions: totalSessions
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
