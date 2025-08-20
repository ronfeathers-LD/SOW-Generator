import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch Google Drive configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error fetching Google Drive config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const configData = await request.json();

    const { data: existingConfig } = await supabase
      .from('google_drive_configs')
      .select('id')
      .eq('is_active', true)
      .single();

    let result;
    if (existingConfig?.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('google_drive_configs')
        .update({
          ...configData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('google_drive_configs')
        .insert([{
          ...configData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving Google Drive config:', error);
    return NextResponse.json(
      { error: 'Failed to save Google Drive configuration' },
      { status: 500 }
    );
  }
}
