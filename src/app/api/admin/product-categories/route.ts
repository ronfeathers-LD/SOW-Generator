import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching product categories:', error);
      return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error in product categories API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('product_categories')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating product category:', error);
      return NextResponse.json({ error: 'Failed to create product category' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in product category creation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
