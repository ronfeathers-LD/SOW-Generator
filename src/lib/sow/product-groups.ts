export interface GroupableProduct {
  id: string; name: string; category: string; is_active: boolean; sort_order: number;
}
export interface CategoryRow { name: string; sort_order: number; is_active: boolean }
export interface ProductGroup {
  key: string; title: string; icon: string; color: 'blue' | 'green' | 'gray';
  products: GroupableProduct[];
}

const KNOWN_META: Record<string, Omit<ProductGroup, 'key' | 'products'>> = {
  FlowBuilder: { title: 'FlowBuilder & Orchestration', icon: '⚡', color: 'blue' },
  BookIt: { title: 'BookIt Family', icon: '📋', color: 'green' },
  Other: { title: 'Other Products', icon: '🔧', color: 'gray' },
};
const FALLBACK_ORDER = ['FlowBuilder', 'BookIt', 'Other'];

export function groupProductsByCategory(
  products: GroupableProduct[],
  categories: CategoryRow[],
): ProductGroup[] {
  const orderedNames = categories.length
    ? categories.map(c => c.name)
    : FALLBACK_ORDER;
  // Categories not in the table (or legacy values) still render, after the known ones.
  const extras = Array.from(new Set(products.map(p => p.category))).filter(n => !orderedNames.includes(n));
  return [...orderedNames, ...extras]
    .map(name => ({
      key: name,
      ...(KNOWN_META[name] ?? { title: name, icon: '🧩', color: 'gray' as const }),
      products: products.filter(p => p.category === name),
    }))
    .filter(g => g.products.length > 0);
}
