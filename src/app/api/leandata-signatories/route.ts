import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET - Fetch all active LeanData signatories (public endpoint)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: signatories } = await supabase
      .from('lean_data_signatories')
      .select('id, name, email, title')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return NextResponse.json(signatories);
  } catch (error) {
    console.error('Error fetching LeanData signatories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signatories' },
      { status: 500 }
    );
  }
} 