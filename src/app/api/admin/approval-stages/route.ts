import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

// GET - Fetch all approval stages with assigned users
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

    const { data: stages, error } = await supabase
      .from('approval_stages')
      .select(`
        *,
        assigned_user:users(id, name, email)
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching approval stages:', error);
      return new NextResponse('Failed to fetch approval stages', { status: 500 });
    }

    return NextResponse.json(stages);
  } catch (error) {
    console.error('Error in approval stages API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PATCH - Update approval stage assignments
export async function PATCH(request: Request) {
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

    const { stageId, assignedUserId } = await request.json();

    const { data: updatedStage, error } = await supabase
      .from('approval_stages')
      .update({ assigned_user_id: assignedUserId })
      .eq('id', stageId)
      .select(`
        *,
        assigned_user:users(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating approval stage:', error);
      return new NextResponse('Failed to update approval stage', { status: 500 });
    }

    return NextResponse.json(updatedStage);
  } catch (error) {
    console.error('Error in approval stages API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
