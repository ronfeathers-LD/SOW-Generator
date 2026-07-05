import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DEFAULT_SEGMENT_RULES } from '@/lib/segment-rules';

const VALID_SEGMENTS = Object.keys(DEFAULT_SEGMENT_RULES);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section_name, section_title, default_content, description, sort_order, is_active } = body;
    const segment = body.segment ?? null;

    if (!section_name || !section_title || !default_content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (segment !== null && !VALID_SEGMENTS.includes(segment)) {
      return NextResponse.json(
        { error: `Invalid segment "${segment}". Must be null/Global or one of: ${VALID_SEGMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const { id } = await params;
    const nextIsActive = is_active !== undefined ? is_active : true;

    // Uniqueness of (section_name, segment) among active rows, excluding
    // this row itself — same rationale as the POST route.
    if (nextIsActive) {
      let duplicateQuery = supabase
        .from('sow_content_templates')
        .select('id')
        .eq('section_name', section_name)
        .eq('is_active', true)
        .neq('id', id);
      duplicateQuery = segment === null
        ? duplicateQuery.is('segment', null)
        : duplicateQuery.eq('segment', segment);
      const { data: existing, error: duplicateError } = await duplicateQuery;

      if (duplicateError) {
        console.error('Error checking for duplicate content template:', duplicateError);
        return NextResponse.json({ error: 'Failed to validate content template' }, { status: 500 });
      }

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: `An active template for section "${section_name}" and segment "${segment ?? 'Global'}" already exists.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('sow_content_templates')
      .update({
        section_name,
        section_title,
        default_content,
        description,
        sort_order: sort_order || 0,
        is_active: nextIsActive,
        segment
      })
      .eq('id', id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { error } = await supabase
      .from('sow_content_templates')
      .delete()
      .eq('id', id);

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