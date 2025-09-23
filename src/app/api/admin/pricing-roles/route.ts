import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export interface PricingRoleConfig {
  id: string;
  role_name: string;
  default_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// GET - Retrieve all pricing roles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    const { data: roles, error } = await supabase
      .from('pricing_roles_config')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('role_name', { ascending: true });

    if (error) {
      console.error('Error retrieving pricing roles:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json(roles || []);
  } catch (error) {
    console.error('Error retrieving pricing roles:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Create new pricing role
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { role_name, default_rate, is_active = true, description = '', sort_order = 0 } = body;

    // Validate required fields
    if (!role_name || default_rate === undefined || default_rate === null) {
      return new NextResponse('Role name and default rate are required', { status: 400 });
    }

    if (typeof default_rate !== 'number' || default_rate < 0) {
      return new NextResponse('Default rate must be a positive number', { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    const insertData: Record<string, unknown> = {
      role_name: role_name.trim(),
      default_rate,
      is_active,
      description: description.trim(),
      sort_order: typeof sort_order === 'number' ? sort_order : 0
    };

    // Only add audit fields if the columns exist (after migration)
    if (session.user.email) {
      insertData.created_by = session.user.email;
      insertData.updated_by = session.user.email;
    }

    const { data: newRole, error } = await supabase
      .from('pricing_roles_config')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new NextResponse('A role with this name already exists', { status: 409 });
      }
      console.error('Error creating pricing role:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
