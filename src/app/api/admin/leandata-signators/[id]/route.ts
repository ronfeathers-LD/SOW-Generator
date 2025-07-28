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

// PUT - Update a LeanData signator
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { name, email, title, isActive } = body;

    if (!name || !email || !title) {
      return NextResponse.json(
        { error: 'Name, email, and title are required' },
        { status: 400 }
      );
    }

    // Check if email already exists for a different signator
    const { data: existingSignator } = await supabase
      .from('lean_data_signators')
      .select('*')
      .eq('email', email)
      .neq('id', (await params).id)
      .single();

    if (existingSignator) {
      return NextResponse.json(
        { error: 'A signator with this email already exists' },
        { status: 400 }
      );
    }

    const { data: signator, error } = await supabase
      .from('lean_data_signators')
      .update({
        name,
        email,
        title,
        is_active: isActive !== undefined ? isActive : true
      })
      .eq('id', (await params).id)
      .select()
      .single();

    return NextResponse.json(signator);
  } catch (error) {
    console.error('Error updating LeanData signator:', error);
    return NextResponse.json(
      { error: 'Failed to update LeanData signator' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a LeanData signator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { error } = await supabase
      .from('lean_data_signators')
      .delete()
      .eq('id', (await params).id);

    return NextResponse.json({ message: 'LeanData signator deleted successfully' });
  } catch (error) {
    console.error('Error deleting LeanData signator:', error);
    return NextResponse.json(
      { error: 'Failed to delete LeanData signator' },
      { status: 500 }
    );
  }
} 