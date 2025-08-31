import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
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

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return new NextResponse('Failed to fetch users', { status: 500 });
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error in admin users API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
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

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return new NextResponse('Missing userId or role', { status: 400 });
    }

    // Validate role
    const validRoles = ['user', 'admin', 'manager', 'pmo'];
    if (!validRoles.includes(role)) {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const updateData = { role };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, role')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return new NextResponse('Failed to update user', { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in admin users PATCH API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
