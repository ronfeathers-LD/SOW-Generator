import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
    }

    // Try to fetch all stages to see current structure
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .order('sort_order', { ascending: true });

    // Try to check if assigned_role column exists
    let assignedRoleTest = null;
    let assignedRoleError = null;
    try {
      const { data: testData, error: testError } = await supabase
        .from('approval_stages')
        .select('assigned_role')
        .limit(1);
      assignedRoleTest = testData;
      assignedRoleError = testError;
    } catch (e) {
      assignedRoleError = e;
    }

    // Try to check if assigned_user_id column exists
    let assignedUserIdTest = null;
    let assignedUserIdError = null;
    try {
      const { data: testData, error: testError } = await supabase
        .from('approval_stages')
        .select('assigned_user_id')
        .limit(1);
      assignedUserIdTest = testData;
      assignedUserIdError = testError;
    } catch (e) {
      assignedUserIdError = e;
    }

    return NextResponse.json({
      stages: stages || [],
      stagesError: stagesError?.message,
      assignedRoleColumn: {
        exists: !assignedRoleError,
        error: assignedRoleError ? (assignedRoleError as Error).message : null,
        testData: assignedRoleTest
      },
      assignedUserIdColumn: {
        exists: !assignedUserIdError,
        error: assignedUserIdError ? (assignedUserIdError as Error).message : null,
        testData: assignedUserIdTest
      },
      migrationNeeded: !!assignedRoleError
    });

  } catch (error) {
    console.error('Error checking approval stages schema:', error);
    return NextResponse.json({ 
      error: 'Failed to check schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
