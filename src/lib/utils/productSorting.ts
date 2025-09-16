import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Product {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Sort products in the correct order based on database sort_order
 * Handles both product IDs (UUIDs) and product names for backward compatibility
 */
export async function sortProducts(products: string[]): Promise<string[]> {
  if (!products || !Array.isArray(products)) return [];
  
  try {
    // Fetch products with their sort_order from the database
    const supabase = await createServerSupabaseClient();
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sort_order')
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

    // Create maps for both ID and name lookups
    const productSortMapById = new Map<string, number>();
    const productSortMapByName = new Map<string, number>();
    const productNameMap = new Map<string, string>(); // ID -> Name mapping
    
    dbProducts.forEach(product => {
      productSortMapById.set(product.id, product.sort_order);
      productSortMapByName.set(product.name, product.sort_order);
      productNameMap.set(product.id, product.name);
    });

    // Sort products based on database sort_order
    // Handle both product IDs and product names
    return products.sort((a, b) => {
      let aOrder = 999; // Default to high number for unknown products
      let bOrder = 999;
      
      // Check if the product is an ID (UUID format) or a name
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a);
      const isUuidB = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b);
      
      if (isUuid) {
        aOrder = productSortMapById.get(a) ?? 999;
      } else {
        aOrder = productSortMapByName.get(a) ?? 999;
      }
      
      if (isUuidB) {
        bOrder = productSortMapById.get(b) ?? 999;
      } else {
        bOrder = productSortMapByName.get(b) ?? 999;
      }
      
      return aOrder - bOrder;
    });

  } catch (error) {
    console.error('Error in sortProducts:', error);
    // Fallback to original order if any error occurs
    return products;
  }
}

/**
 * Resolve product IDs to names for display
 * Handles both product IDs (UUIDs) and product names for backward compatibility
 */
export async function resolveProductNames(products: string[]): Promise<string[]> {
  if (!products || !Array.isArray(products)) return [];
  
  try {
    // Fetch products from the database
    const supabase = await createServerSupabaseClient();
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching products for name resolution:', error);
      // Fallback to original values if database fetch fails
      return products;
    }

    if (!dbProducts || dbProducts.length === 0) {
      console.warn('No products found in database for name resolution');
      return products;
    }

    // Create a map of product IDs to names
    const productNameMap = new Map<string, string>();
    dbProducts.forEach(product => {
      productNameMap.set(product.id, product.name);
    });

    // Resolve product IDs to names, keeping names as-is
    return products.map(product => {
      // Check if the product is an ID (UUID format) or a name
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product);
      
      if (isUuid) {
        // It's a product ID, resolve to name
        return productNameMap.get(product) || product; // Fallback to original if not found
      } else {
        // It's already a name, keep as-is
        return product;
      }
    });

  } catch (error) {
    console.error('Error in resolveProductNames:', error);
    // Fallback to original values if any error occurs
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
