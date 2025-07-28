import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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

// GET - Fetch all LeanData signators
export async function GET() {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { data: signators, error } = await supabase
      .from('lean_data_signators')
      .select('*')
      .order('name', { ascending: true });

    return NextResponse.json(signators);
  } catch (error) {
    console.error('Error fetching LeanData signators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signators' },
      { status: 500 }
    );
  }
}

// POST - Create a new LeanData signator
export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { name, email, title } = body;

    if (!name || !email || !title) {
      return NextResponse.json(
        { error: 'Name, email, and title are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingSignator } = await supabase
      .from('lean_data_signators')
      .select('*')
      .eq('email', email)
      .single();

    if (existingSignator) {
      return NextResponse.json(
        { error: 'A signator with this email already exists' },
        { status: 400 }
      );
    }

    const { data: signator, error } = await supabase
      .from('lean_data_signators')
      .insert({
        name,
        email,
        title
      })
      .select()
      .single();

    return NextResponse.json(signator, { status: 201 });
  } catch (error) {
    console.error('Error creating LeanData signator:', error);
    return NextResponse.json(
      { error: 'Failed to create LeanData signator' },
      { status: 500 }
    );
  }
} 