import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('name', { ascending: true });

    if (usersError) {
      return NextResponse.json({ 
        error: 'Failed to fetch users',
        details: usersError 
      });
    }

    // Get current approval stage assignments
    const { data: stageAssignments, error: assignmentsError } = await supabase
      .from('approval_stages')
      .select(`
        id,
        name,
        assigned_user_id,
        assigned_user:users(id, name, email)
      `)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      users: users || [],
      stageAssignments: stageAssignments || [],
      userCount: users?.length || 0,
      assignmentsError: assignmentsError?.message
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ 
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
