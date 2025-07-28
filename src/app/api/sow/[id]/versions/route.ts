import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the original SOW
    const { data: originalSOW, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error || !originalSOW) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get all versions of this SOW
    const { data: versions } = await supabase
      .from('sows')
      .select('id, version, is_latest, created_at')
      .or(`id.eq.${(await params).id},parent_id.eq.${(await params).id}`)
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