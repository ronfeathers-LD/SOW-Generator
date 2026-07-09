import { describe, it, expect } from 'vitest';
import { groupProductsByCategory, type CategoryRow, type GroupableProduct } from './product-groups';

const p = (name: string, category: string): GroupableProduct =>
  ({ id: name, name, category, is_active: true, sort_order: 0 });
const c = (name: string, sort: number): CategoryRow => ({ name, sort_order: sort, is_active: true });

describe('groupProductsByCategory', () => {
  it('orders groups by category sort_order and keeps known meta', () => {
    const groups = groupProductsByCategory(
      [p('Router', 'FlowBuilder'), p('Forms', 'BookIt')],
      [c('BookIt', 1), c('FlowBuilder', 2)]
    );
    expect(groups.map(g => g.key)).toEqual(['BookIt', 'FlowBuilder']);
    expect(groups[0].title).toBe('BookIt Family');
    expect(groups[0].color).toBe('green');
    expect(groups[1].icon).toBe('⚡');
  });

  it('renders unknown categories with fallback meta (fixes silent drop)', () => {
    const groups = groupProductsByCategory(
      [p('Usergems Sync', 'Integrations')],
      [c('Integrations', 5)]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'Integrations', title: 'Integrations', color: 'gray', icon: '🧩' });
    expect(groups[0].products.map(x => x.name)).toEqual(['Usergems Sync']);
  });

  it('omits empty groups and groups products of categories missing from the table under their own name', () => {
    const groups = groupProductsByCategory(
      [p('Router', 'FlowBuilder'), p('Mystery', 'Uncatalogued')],
      [c('FlowBuilder', 1), c('BookIt', 2)]
    );
    expect(groups.map(g => g.key)).toEqual(['FlowBuilder', 'Uncatalogued']);
  });

  it('falls back to legacy three-bucket order when categories fetch is empty', () => {
    const groups = groupProductsByCategory(
      [p('X', 'Other'), p('Router', 'FlowBuilder')],
      []
    );
    expect(groups.map(g => g.key)).toEqual(['FlowBuilder', 'Other']);
  });
});
