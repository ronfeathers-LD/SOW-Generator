import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseApi } from '@/lib/supabase-api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to unhide SOWs' }, { status: 403 });
    }

    const { id } = await params;

    // Check if SOW exists and is hidden
    const { data: existingSOW, error: fetchError } = await supabaseApi
      .from('sows')
      .select('id, sow_title, is_hidden')
      .eq('id', id)
      .single();

    if (fetchError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    if (!existingSOW.is_hidden) {
      return NextResponse.json({ error: 'SOW is not hidden' }, { status: 400 });
    }

    // Unhide the SOW
    const { data: updatedSOW, error: updateError } = await supabaseApi
      .from('sows')
      .update({ 
        is_hidden: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error unhiding SOW:', updateError);
      return NextResponse.json({ error: 'Failed to unhide SOW' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SOW unhidden successfully',
      sow: updatedSOW
    });

  } catch (error) {
    console.error('Error in unhide SOW API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
