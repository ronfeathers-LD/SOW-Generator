import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseApi } from '@/lib/supabase-api';

// GET - Fetch all change orders for a specific SOW
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sowId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sowId } = await params;

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

    // Verify the user has access to this SOW
    const { data: sow, error: sowError } = await supabaseApi
      .from('sows')
      .select('id, author_id')
      .eq('id', sowId)
      .single();

    if (sowError || !sow) {
      console.error('Error fetching SOW:', sowError);
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this SOW (either author or admin)
    if (sow.author_id !== user.id) {
      // For now, we'll only allow the SOW author to see change orders
      // In the future, you might want to add admin access or other permissions
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch change orders for this SOW
    const { data: changeOrders, error } = await supabaseApi
      .from('change_orders')
      .select('*')
      .eq('sow_id', sowId)
      .eq('is_hidden', false)
      .order('change_number', { ascending: true });

    if (error) {
      console.error('Error fetching change orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch change orders' },
        { status: 500 }
      );
    }

    return NextResponse.json(changeOrders);
  } catch (error) {
    console.error('Error in change orders by SOW GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
