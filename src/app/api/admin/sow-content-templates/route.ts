import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DEFAULT_SEGMENT_RULES } from '@/lib/segment-rules';

const VALID_SEGMENTS = Object.keys(DEFAULT_SEGMENT_RULES);

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section_name, section_title, default_content, description, sort_order } = body;
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

    // Uniqueness of (section_name, segment) among active rows is enforced
    // here, not at the DB layer (the live table's drift-era unique
    // constraint was on section_name alone and has been dropped — see
    // migration 035's amendment).
    let duplicateQuery = supabase
      .from('sow_content_templates')
      .select('id')
      .eq('section_name', section_name)
      .eq('is_active', true);
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

    const { data, error } = await supabase
      .from('sow_content_templates')
      .insert({
        section_name,
        section_title,
        default_content,
        description,
        sort_order: sort_order || 0,
        is_active: true,
        segment
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