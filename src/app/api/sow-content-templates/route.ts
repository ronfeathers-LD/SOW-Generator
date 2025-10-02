import { NextResponse } from 'next/server';
import { supabaseApi } from '@/lib/supabase-api';

export async function GET() {
  try {
    const { data, error } = await supabaseApi
      .from('sow_content_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching content templates:', error);
      return NextResponse.json({ error: 'Failed to fetch content templates' }, { status: 500 });
    }

    // Transform the data to match the expected interface
    const transformedData = data.map(template => ({
      ...template,
      section_name: template.name,
      section_title: template.name, // Use name as title for now
      default_content: template.content?.default_content || template.content || '',
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in GET /api/sow-content-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
