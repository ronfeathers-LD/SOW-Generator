/**
 * Product compatibility utilities to handle both product names and IDs
 * This is a temporary solution to make the app work while we migrate from names to IDs
 */

import { isRoutingProductById, isLeadToAccountProductById, isFormsProductById, isLinksProductById, isHandoffProductById } from '@/lib/constants/products';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * Find a product by either ID or name
 * This handles the transition period where SOWs might have either names or IDs
 */
export function findProductByIdOrName(products: Product[], identifier: string): Product | undefined {
  // First try to find by ID (new format)
  let product = products.find(p => p.id === identifier);
  
  // If not found by ID, try to find by name (old format)
  if (!product) {
    product = products.find(p => p.name === identifier);
  }
  
  return product;
}

/**
 * Check if a product is selected, handling both ID and name formats
 */
export function isProductSelectedByIdOrName(selectedProducts: string[], identifier: string): boolean {
  return selectedProducts.includes(identifier);
}

/**
 * Check if a product type matches, handling both ID and name formats
 */
export function isProductTypeByIdOrName(products: Product[], identifier: string, typeChecker: (id: string) => boolean): boolean {
  const product = findProductByIdOrName(products, identifier);
  return product ? typeChecker(product.id) : false;
}

/**
 * Get product ID from either ID or name format
 */
export function getProductIdByIdOrName(products: Product[], identifier: string): string | null {
  const product = findProductByIdOrName(products, identifier);
  return product ? product.id : null;
}

/**
 * Check if any routing product is selected, handling both formats
 */
export function isAnyRoutingProductSelected(products: Product[], selectedProducts: string[]): boolean {
  return selectedProducts.some(identifier => {
    const product = findProductByIdOrName(products, identifier);
    return product ? (isRoutingProductById(product.id) || isLeadToAccountProductById(product.id)) : false;
  });
}

/**
 * Check if any BookIt product is selected, handling both formats
 */
export function isAnyBookItProductSelected(products: Product[], selectedProducts: string[]): boolean {
  return selectedProducts.some(identifier => {
    const product = findProductByIdOrName(products, identifier);
    return product ? (isFormsProductById(product.id) || isLinksProductById(product.id) || isHandoffProductById(product.id)) : false;
  });
}

/**
 * Check if Forms product is selected, handling both formats
 */
export function isFormsProductSelected(products: Product[], selectedProducts: string[]): boolean {
  return selectedProducts.some(identifier => {
    const product = findProductByIdOrName(products, identifier);
    return product ? isFormsProductById(product.id) : false;
  });
}

/**
 * Check if Handoff product is selected, handling both formats
 */
export function isHandoffProductSelected(products: Product[], selectedProducts: string[]): boolean {
  return selectedProducts.some(identifier => {
    const product = findProductByIdOrName(products, identifier);
    return product ? isHandoffProductById(product.id) : false;
  });
}
