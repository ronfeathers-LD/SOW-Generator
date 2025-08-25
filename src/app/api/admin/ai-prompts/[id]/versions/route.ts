import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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

    const { data: versions, error } = await supabase
      .from('ai_prompt_versions')
      .select('*')
      .eq('prompt_id', id)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching prompt versions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompt versions' },
        { status: 500 }
      );
    }

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error in AI prompt versions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
