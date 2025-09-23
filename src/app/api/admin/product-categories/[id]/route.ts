import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('product_categories')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product category:', error);
      return NextResponse.json({ error: 'Failed to update product category' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in product category update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Check if any products are using this category
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('category', id)
      .limit(1);

    if (productsError) {
      console.error('Error checking products using category:', productsError);
      return NextResponse.json({ error: 'Failed to check category usage' }, { status: 500 });
    }

    if (products && products.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that is being used by products' 
      }, { status: 400 });
    }

    // Soft delete the category
    const { error } = await supabase
      .from('product_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting product category:', error);
      return NextResponse.json({ error: 'Failed to delete product category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in product category deletion API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
