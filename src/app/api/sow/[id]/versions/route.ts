import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the original SOW (excluding hidden SOWs)
    const { data: originalSOW, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .eq('is_hidden', false)
      .single();

    if (error || !originalSOW) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get all versions of this SOW (excluding hidden versions)
    const { data: versions } = await supabase
      .from('sows')
      .select('id, version, is_latest, created_at')
      .or(`id.eq.${(await params).id},parent_id.eq.${(await params).id}`)
      .eq('is_hidden', false)
      .order('version', { ascending: false });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
} 