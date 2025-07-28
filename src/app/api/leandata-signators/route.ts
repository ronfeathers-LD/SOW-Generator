import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all active LeanData signators (public endpoint)
export async function GET() {
  try {
    const { data: signators, error } = await supabase
      .from('lean_data_signators')
      .select('id, name, email, title')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return NextResponse.json(signators);
  } catch (error) {
    console.error('Error fetching LeanData signators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signators' },
      { status: 500 }
    );
  }
} 