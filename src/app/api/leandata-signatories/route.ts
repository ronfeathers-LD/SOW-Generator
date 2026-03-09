import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

// GET - Fetch all active LeanData signatories (public endpoint)
export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: signatories, error: dbError } = await supabase
      .from('lean_data_signatories')
      .select('id, name, email, title')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (dbError) {
      console.error('Supabase error fetching signatories:', dbError);
      return NextResponse.json(
        { error: 'Database error fetching signatories' },
        { status: 500 }
      );
    }

    return NextResponse.json(signatories ?? []);
  } catch (error) {
    console.error('Error fetching LeanData signatories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signatories' },
      { status: 500 }
    );
  }
} 