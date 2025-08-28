/**
 * Sort products in the correct order: Matching first, then orchestration, then BookIt
 */
export function sortProducts(products: string[]): string[] {
  if (!products || !Array.isArray(products)) return [];
  
  // Define the correct sort order
  const sortOrder = [
    'Lead to Account Matching',
    'Lead Routing',
    'Contact Routing', 
    'Account Routing',
    'BookIt for Forms',
    'BookIt Handoff (with Smartrep)',
    'BookIt Handoff (without Smartrep)',
    'BookIt Links'
  ];
  
  // Sort products based on the defined order
  return products.sort((a, b) => {
    const aIndex = sortOrder.indexOf(a);
    const bIndex = sortOrder.indexOf(b);
    
    // If both products are in the sort order, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one product is in the sort order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither product is in the sort order, maintain original order
    return 0;
  });
}
