import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    console.log('🔍 Admin changelog API - Session check:');
    console.log('👤 Session exists:', !!session);
    console.log('👤 User exists:', !!session?.user);
    console.log('👤 User email:', session?.user?.email);
    console.log('👤 User role:', session?.user?.role);
    
    if (!session?.user) {
      console.log('❌ No session or user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      console.log('❌ User is not admin. Role:', session.user.role);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin access confirmed, proceeding with changelog fetch');

    const { searchParams } = new URL(request.url);
    const sowId = searchParams.get('sow_id');
    const changeType = searchParams.get('change_type');
    const dateRange = searchParams.get('date_range');

    const supabase = createServiceRoleClient();

    // Build the query
    let query = supabase
      .from('sow_changelog')
      .select(`
        *,
        sow:sows!sow_changelog_sow_id_fkey(sow_title, client_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (sowId && sowId !== 'all') {
      query = query.eq('sow_id', sowId);
    }

    if (changeType && changeType !== 'all') {
      query = query.eq('action', changeType);
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: changelog, error } = await query;

    if (error) {
      console.error('❌ Database error fetching changelog:', error);
      return NextResponse.json(
        { error: 'Failed to fetch changelog' },
        { status: 500 }
      );
    }

    console.log('✅ Changelog fetched successfully, entries count:', changelog?.length || 0);

    // Transform the data to include SOW and user information
    const transformedChangelog = changelog?.map(entry => ({
      id: entry.id,
      sow_id: entry.sow_id,
      user_id: entry.user_id,
      change_type: entry.action, // Map action to change_type for frontend compatibility
      field_name: entry.field_name,
      old_value: entry.previous_value, // Map previous_value to old_value
      new_value: entry.new_value,
      change_summary: entry.diff_summary, // Map diff_summary to change_summary
      created_at: entry.created_at,
      sow_title: entry.sow?.sow_title,
      client_name: entry.sow?.client_name,
      user_name: entry.user_id // Use user_id directly since we can't join with users table
    })) || [];

    return NextResponse.json(transformedChangelog);

  } catch (error) {
    console.error('Error in admin changelog API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
