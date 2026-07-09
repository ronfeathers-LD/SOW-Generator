// src/lib/gemini/svf-contract.test.ts
import { describe, it, expect } from 'vitest';
import { buildSolutionsAndScopeContract } from './svf-contract';

describe('buildSolutionsAndScopeContract', () => {
  it('names all four SVF pillars', () => {
    const s = buildSolutionsAndScopeContract(['Routing', 'BookIt']);
    for (const pillar of ['Acquire', 'Adopt', 'Retain', 'Expand']) {
      expect(s).toContain(pillar);
    }
  });

  it('lists every selected product', () => {
    const s = buildSolutionsAndScopeContract(['Routing', 'BookIt']);
    expect(s).toContain('Routing');
    expect(s).toContain('BookIt');
  });

  it('declares both scopeItems and pillar-nested solutions keys', () => {
    const s = buildSolutionsAndScopeContract(['Routing']);
    expect(s).toContain('"scopeItems"');
    expect(s).toContain('"solutions"');
    expect(s).toContain('"pillar"');
    expect(s).toContain('"products"');
  });

  it('handles no selected products without throwing', () => {
    expect(() => buildSolutionsAndScopeContract([])).not.toThrow();
  });
});
