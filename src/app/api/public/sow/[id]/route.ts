import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: sow, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error || !sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    return NextResponse.json(sow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 