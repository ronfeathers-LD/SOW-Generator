import { describe, it, expect } from 'vitest';
import { SVF_PILLARS } from './svf-pillars';

describe('SVF_PILLARS', () => {
  it('lists the four pillars in canonical order and casing', () => {
    expect(SVF_PILLARS.map((p) => p.name)).toEqual([
      'Acquire',
      'Adopt',
      'Retain',
      'Expand',
    ]);
  });

  it('gives every pillar a non-empty one-line definition', () => {
    for (const p of SVF_PILLARS) {
      expect(p.definition.trim().length).toBeGreaterThan(0);
      expect(p.definition).not.toContain('\n');
    }
  });
});
