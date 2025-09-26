import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseApi } from '@/lib/supabase-api';

// GET - Fetch a specific change order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the change order with SOW information
    const { data: changeOrder, error } = await supabaseApi
      .from('change_orders')
      .select(`
        *,
        sows!inner(
          id,
          sow_title,
          client_name,
          start_date,
          template
        )
      `)
      .eq('id', id)
      .eq('author_id', user.id)
      .eq('is_hidden', false)
      .single();

    if (error || !changeOrder) {
      console.error('Error fetching change order:', error);
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(changeOrder);
  } catch (error) {
    console.error('Error in change order GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a change order
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the change order exists and belongs to the user
    const { data: existingChangeOrder, error: fetchError } = await supabaseApi
      .from('change_orders')
      .select('*')
      .eq('id', id)
      .eq('author_id', user.id)
      .eq('is_hidden', false)
      .single();

    if (fetchError || !existingChangeOrder) {
      console.error('Error fetching change order:', fetchError);
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      );
    }

    // Update the change order
    const { data: changeOrder, error: updateError } = await supabaseApi
      .from('change_orders')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating change order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update change order' },
        { status: 500 }
      );
    }

    return NextResponse.json(changeOrder);
  } catch (error) {
    console.error('Error in change order PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a change order
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete the change order
    const { error: deleteError } = await supabaseApi
      .from('change_orders')
      .update({ is_hidden: true })
      .eq('id', id)
      .eq('author_id', user.id);

    if (deleteError) {
      console.error('Error deleting change order:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete change order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Change order deleted successfully' });
  } catch (error) {
    console.error('Error in change order DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
