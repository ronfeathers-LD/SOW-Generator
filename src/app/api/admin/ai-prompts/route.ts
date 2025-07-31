import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: prompts, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching AI prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI prompts' },
        { status: 500 }
      );
    }

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error in AI prompts GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      .insert([
        {
          name,
          description: description || '',
          prompt_content,
          is_active: is_active !== undefined ? is_active : true,
          sort_order: sort_order || 0
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to create AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error in AI prompts POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 