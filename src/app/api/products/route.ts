import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error in products GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 