import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section_name, section_title, default_content, description, sort_order, is_active } = body;

    if (!section_name || !section_title || !default_content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sow_content_templates')
      .update({
        section_name,
        section_title,
        default_content,
        description,
        sort_order: sort_order || 0,
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content template:', error);
      return NextResponse.json({ error: 'Failed to update content template' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/admin/sow-content-templates/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('sow_content_templates')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting content template:', error);
      return NextResponse.json({ error: 'Failed to delete content template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/sow-content-templates/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 