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

// PUT - Update a LeanData signatory
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

    // Check if email already exists for a different signatory
    const { data: existingSignatory } = await supabase
      .from('lean_data_signatories')
      .select('*')
      .eq('email', email)
      .neq('id', (await params).id)
      .single();

    if (existingSignatory) {
      return NextResponse.json(
        { error: 'A signatory with this email already exists' },
        { status: 400 }
      );
    }

    const { data: signatory, error } = await supabase
      .from('lean_data_signatories')
      .update({
        name,
        email,
        title,
        is_active: isActive !== undefined ? isActive : true
      })
      .eq('id', (await params).id)
      .select()
      .single();

    return NextResponse.json(signatory);
  } catch (error) {
    console.error('Error updating LeanData signatory:', error);
    return NextResponse.json(
      { error: 'Failed to update LeanData signatory' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a LeanData signatory
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
      .from('lean_data_signatories')
      .delete()
      .eq('id', (await params).id);

    return NextResponse.json({ message: 'LeanData signatory deleted successfully' });
  } catch (error) {
    console.error('Error deleting LeanData signatory:', error);
    return NextResponse.json(
      { error: 'Failed to delete LeanData signatory' },
      { status: 500 }
    );
  }
} 