import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sow_content_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching content templates:', error);
      return NextResponse.json({ error: 'Failed to fetch content templates' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/admin/sow-content-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section_name, section_title, default_content, description, sort_order } = body;

    if (!section_name || !section_title || !default_content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sow_content_templates')
      .insert({
        section_name,
        section_title,
        default_content,
        description,
        sort_order: sort_order || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content template:', error);
      return NextResponse.json({ error: 'Failed to create content template' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/admin/sow-content-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 