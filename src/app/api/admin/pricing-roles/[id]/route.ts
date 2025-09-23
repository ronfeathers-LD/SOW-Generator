import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

// PUT - Update pricing role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role_name, default_rate, is_active, description = '', sort_order = 0 } = body;

    // Validate required fields
    if (!role_name || default_rate === undefined || default_rate === null) {
      return new NextResponse('Role name and default rate are required', { status: 400 });
    }

    if (typeof default_rate !== 'number' || default_rate < 0) {
      return new NextResponse('Default rate must be a positive number', { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    const updateData: Record<string, unknown> = {
      role_name: role_name.trim(),
      default_rate,
      is_active,
      description: description.trim(),
      sort_order: typeof sort_order === 'number' ? sort_order : 0
    };

    // Only add updated_by if the column exists (after migration)
    if (session.user.email) {
      updateData.updated_by = session.user.email;
    }

    const { data: updatedRole, error } = await supabase
      .from('pricing_roles_config')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new NextResponse('A role with this name already exists', { status: 409 });
      }
      if (error.code === 'PGRST116') { // No rows returned
        return new NextResponse('Pricing role not found', { status: 404 });
      }
      console.error('Error updating pricing role:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error updating pricing role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE - Delete pricing role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const supabase = createServiceRoleClient();
    
    const { error } = await supabase
      .from('pricing_roles_config')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return new NextResponse('Pricing role not found', { status: 404 });
      }
      console.error('Error deleting pricing role:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pricing role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
