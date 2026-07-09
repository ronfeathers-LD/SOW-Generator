import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  isPillarSolutions,
  solutionsToDeliverablesHtml,
  solutionsToDeliverablesText,
  scopeGroupsToHtml,
} from './svf-content';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<b>a & "b"</b>')).toBe('&lt;b&gt;a &amp; &quot;b&quot;&lt;/b&gt;');
  });
});

describe('isPillarSolutions', () => {
  it('true for the new array shape, false for the flat object shape', () => {
    expect(isPillarSolutions([{ pillar: 'Acquire', products: {} }])).toBe(true);
    expect(isPillarSolutions({ Routing: ['x'] })).toBe(false);
  });
});

describe('solutionsToDeliverablesHtml', () => {
  it('renders the FLAT shape as h3-per-product + ul (legacy behavior)', () => {
    const html = solutionsToDeliverablesHtml({ Routing: ['Route leads'], BookIt: ['Book meetings'] });
    expect(html).toContain('<h3');
    expect(html).toContain('Routing');
    expect(html).toContain('<li');
    expect(html).toContain('Route leads');
    expect(html).not.toContain('<h4'); // flat shape has no product sub-heading
  });

  it('renders the PILLAR shape as h3-per-pillar + h4-per-product + ul, in SVF order', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Retain', products: { Routing: ['Keep routing healthy'] } },
      { pillar: 'Acquire', products: { BookIt: ['Speed to lead'] } },
    ]);
    // Acquire must render before Retain regardless of input order
    expect(html.indexOf('Acquire')).toBeLessThan(html.indexOf('Retain'));
    expect(html).toContain('<h3');
    expect(html).toContain('<h4');
    expect(html).toContain('BookIt');
    expect(html).toContain('Speed to lead');
  });

  it('skips empty pillars and empty products', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Acquire', products: { BookIt: [] } },
      { pillar: 'Adopt', products: {} },
    ]);
    expect(html).toBe('');
  });

  it('escapes injected content', () => {
    const html = solutionsToDeliverablesHtml({ '<x>': ['<script>'] });
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('renders all four pillars in canonical SVF order regardless of scrambled input order', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Expand', products: { ExpandProduct: ['Grow usage'] } },
      { pillar: 'Retain', products: { RetainProduct: ['Keep it healthy'] } },
      { pillar: 'Adopt', products: { AdoptProduct: ['Drive adoption'] } },
      { pillar: 'Acquire', products: { AcquireProduct: ['Win new revenue'] } },
    ]);
    const acquireIdx = html.indexOf('Acquire');
    const adoptIdx = html.indexOf('Adopt');
    const retainIdx = html.indexOf('Retain');
    const expandIdx = html.indexOf('Expand');
    expect(acquireIdx).toBeGreaterThanOrEqual(0);
    expect(acquireIdx).toBeLessThan(adoptIdx);
    expect(adoptIdx).toBeLessThan(retainIdx);
    expect(retainIdx).toBeLessThan(expandIdx);
  });

  it('elides flat-shape products with no items or only whitespace items', () => {
    expect(solutionsToDeliverablesHtml({ Routing: [] })).toBe('');
    expect(solutionsToDeliverablesHtml({ Routing: ['  '] })).toBe('');
  });

  it('escapes an adversarial product NAME nested under a pillar (array shape)', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Acquire', products: { '<script>x</script>': ['ok'] } },
    ]);
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>x</script>');
  });
});

describe('solutionsToDeliverablesText', () => {
  it('flattens the flat shape', () => {
    expect(solutionsToDeliverablesText({ Routing: ['a', 'b'] })).toEqual([
      'Routing:',
      '  • a',
      '  • b',
    ]);
  });

  it('flattens the pillar shape in SVF order with product lines', () => {
    const lines = solutionsToDeliverablesText([
      { pillar: 'Adopt', products: { BookIt: ['x'] } },
      { pillar: 'Acquire', products: { Routing: ['y'] } },
    ]);
    expect(lines[0]).toBe('Acquire');
    expect(lines).toContain('Routing:');
    expect(lines).toContain('  • y');
  });
});

describe('scopeGroupsToHtml', () => {
  it('returns empty string for undefined/empty', () => {
    expect(scopeGroupsToHtml(undefined)).toBe('');
    expect(scopeGroupsToHtml([])).toBe('');
    expect(scopeGroupsToHtml([{ pillar: 'Acquire', items: [] }])).toBe('');
  });

  it('renders pillar-headed lists in SVF order and escapes items', () => {
    const html = scopeGroupsToHtml([
      { pillar: 'Expand', items: ['Grow usage'] },
      { pillar: 'Acquire', items: ['<b>Win</b>'] },
    ]);
    expect(html.indexOf('Acquire')).toBeLessThan(html.indexOf('Expand'));
    expect(html).toContain('&lt;b&gt;Win&lt;/b&gt;');
    expect(html).toContain('<h3');
    expect(html).toContain('<li');
  });

  it('renders all four pillars in canonical SVF order regardless of scrambled input order', () => {
    const html = scopeGroupsToHtml([
      { pillar: 'Expand', items: ['Expand item'] },
      { pillar: 'Retain', items: ['Retain item'] },
      { pillar: 'Adopt', items: ['Adopt item'] },
      { pillar: 'Acquire', items: ['Acquire item'] },
    ]);
    const acquireIdx = html.indexOf('Acquire');
    const adoptIdx = html.indexOf('Adopt');
    const retainIdx = html.indexOf('Retain');
    const expandIdx = html.indexOf('Expand');
    expect(acquireIdx).toBeGreaterThanOrEqual(0);
    expect(acquireIdx).toBeLessThan(adoptIdx);
    expect(adoptIdx).toBeLessThan(retainIdx);
    expect(retainIdx).toBeLessThan(expandIdx);
  });

  it('escapes an adversarial item string containing a script tag (untyped item path)', () => {
    const html = scopeGroupsToHtml([{ pillar: 'Acquire', items: ['<script>alert(1)</script>'] }]);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
