import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { session };
}

// GET - Fetch all LeanData signatories
export async function GET() {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const supabase = createServiceRoleClient();
    
    const { data: signatories, error: dbError } = await supabase
      .from('lean_data_signatories')
      .select('*')
      .order('name', { ascending: true });

    if (dbError) {
      console.error('Supabase error fetching signatories:', dbError);
      return NextResponse.json(
        { error: 'Database error fetching signatories' },
        { status: 500 }
      );
    }

    return NextResponse.json(signatories ?? []);
  } catch (error) {
    console.error('Error fetching LeanData signatories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signatories' },
      { status: 500 }
    );
  }
}

// POST - Create a new LeanData signatory
export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const supabase = createServiceRoleClient();
    
    const body = await request.json();
    const { name, email, title, isActive = true } = body;

    if (!name || !email || !title) {
      return NextResponse.json(
        { error: 'Name, email, and title are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingSignatory } = await supabase
      .from('lean_data_signatories')
      .select('*')
      .eq('email', email)
      .single();

    if (existingSignatory) {
      return NextResponse.json(
        { error: 'A signatory with this email already exists' },
        { status: 400 }
      );
    }

    const { data: signatory } = await supabase
      .from('lean_data_signatories')
      .insert({
        name,
        email,
        title,
        is_active: isActive
      })
      .select()
      .single();

    return NextResponse.json(signatory, { status: 201 });
  } catch (error) {
    console.error('Error creating LeanData signatory:', error);
    return NextResponse.json(
      { error: 'Failed to create LeanData signatory' },
      { status: 500 }
    );
  }
} 