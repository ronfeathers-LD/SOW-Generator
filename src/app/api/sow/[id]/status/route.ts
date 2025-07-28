import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (!user || user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { status, version } = await request.json();

    // Validate status
    const validStatuses = ['draft', 'in_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }

    // Get the current SOW
    const { data: currentSOW, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error || !currentSOW) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Verify version matches
    if (currentSOW.version !== version) {
      return new NextResponse('Version mismatch', { status: 400 });
    }

    // Update SOW status
    const { data: updatedSOW } = await supabase
      .from('sows')
      .update({ status })
      .eq('id', (await params).id)
      .select()
      .single();

    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 