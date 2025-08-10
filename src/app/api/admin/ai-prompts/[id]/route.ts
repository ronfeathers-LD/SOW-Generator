import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, prompt_content, is_active, sort_order } = body;

    if (!name || !prompt_content) {
      return NextResponse.json(
        { error: 'Name and prompt content are required' },
        { status: 400 }
      );
    }

    const { data: prompt, error } = await supabase
      .from('ai_prompts')
      .update({
        name,
        description: description || '',
        prompt_content,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to update AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error in AI prompt PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { error } = await supabase
      .from('ai_prompts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to delete AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in AI prompt DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 