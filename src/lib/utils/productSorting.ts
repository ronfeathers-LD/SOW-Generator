import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Product {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Sort products in the correct order based on database sort_order
 */
export async function sortProducts(products: string[]): Promise<string[]> {
  if (!products || !Array.isArray(products)) return [];
  
  try {
    // Fetch products with their sort_order from the database
    const supabase = await createServerSupabaseClient();
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching products for sorting:', error);
      // Fallback to original order if database fetch fails
      return products;
    }

    if (!dbProducts || dbProducts.length === 0) {
      console.warn('No products found in database for sorting');
      return products;
    }

    // Create a map of product names to their sort_order
    const productSortMap = new Map<string, number>();
    dbProducts.forEach(product => {
      productSortMap.set(product.name, product.sort_order);
    });

    // Sort products based on database sort_order
    return products.sort((a, b) => {
      const aOrder = productSortMap.get(a) ?? 999; // Default to high number for unknown products
      const bOrder = productSortMap.get(b) ?? 999;
      
      return aOrder - bOrder;
    });

  } catch (error) {
    console.error('Error in sortProducts:', error);
    // Fallback to original order if any error occurs
    return products;
  }
}

/**
 * Client-side version that accepts pre-fetched products
 * Use this when you already have the products data from an API call
 */
export function sortProductsWithData(products: string[], productData: Product[]): string[] {
  if (!products || !Array.isArray(products)) return [];
  
  // Create a map of product names to their sort_order
  const productSortMap = new Map<string, number>();
  productData.forEach(product => {
    productSortMap.set(product.name, product.sort_order);
  });

  // Sort products based on database sort_order
  return products.sort((a, b) => {
    const aOrder = productSortMap.get(a) ?? 999; // Default to high number for unknown products
    const bOrder = productSortMap.get(b) ?? 999;
    
    return aOrder - bOrder;
  });
}
