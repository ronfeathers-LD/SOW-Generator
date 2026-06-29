import { describe, it, expect } from 'vitest';
import { recalculateNeedsConfirm } from './recalculate-guard';

describe('recalculateNeedsConfirm', () => {
  it('requires confirm only when the user has hand-edited', () => {
    expect(recalculateNeedsConfirm({ auto_calculated: true })).toBe(false);
    expect(recalculateNeedsConfirm({ auto_calculated: false })).toBe(true);
    expect(recalculateNeedsConfirm(undefined)).toBe(false);
  });

  it('treats missing auto_calculated as not needing confirm', () => {
    expect(recalculateNeedsConfirm({})).toBe(false);
  });
});
