import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: prompts, error } = await supabase
      .from('ai_prompts')
      .select('id, name, description, prompt_content, is_active, sort_order, created_at, updated_at, current_version')
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
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate that session.user.id exists
    if (!session.user?.id) {
      console.error('Missing session user ID');
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 400 }
      );
    }

    // Debug logging
    console.log('Session user ID:', session.user.id, 'Type:', typeof session.user.id);

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
          sort_order: sort_order || 0,
          current_version: 1
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

    // Create initial version record
    const { error: versionError } = await supabase
      .from('ai_prompt_versions')
      .insert([
        {
          prompt_id: prompt.id,
          version_number: 1,
          name,
          description: description || '',
          prompt_content,
          is_active: is_active !== undefined ? is_active : true,
          sort_order: sort_order || 0,
          created_by: session.user.id,
          change_reason: 'Initial version',
          is_current: true
        }
      ]);

    if (versionError) {
      console.error('Error creating initial version record:', versionError);
      // Don't fail the entire operation if versioning fails
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