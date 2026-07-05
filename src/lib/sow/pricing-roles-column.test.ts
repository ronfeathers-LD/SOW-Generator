import { describe, it, expect } from 'vitest';
import { buildPricingRolesColumn } from './pricing-roles-column';

const roles = [
  { role: 'Onboarding Specialist', ratePerHour: 250, totalHours: 40 },
  { role: 'Project Manager', ratePerHour: 250, totalHours: 10 },
];

describe('buildPricingRolesColumn (#104 canonical shape)', () => {
  it('always returns the object shape, never a bare array', () => {
    const col = buildPricingRolesColumn({ roles });
    expect(Array.isArray(col)).toBe(false);
    expect(col.roles).toEqual(roles);
    expect(col.discount_type).toBe('none');
  });

  it('recomputes totals server-side and ignores client-supplied ones', () => {
    const col = buildPricingRolesColumn({
      roles,
      // Not part of PricingInput — a hostile client sending these has no effect.
      ...( { subtotal: 1, discount_total: 999999, total_amount: 1 } as object),
    });
    expect(col.subtotal).toBe(250 * 40 + 250 * 10);
    expect(col.discount_total).toBe(0);
    expect(col.total_amount).toBe(col.subtotal);
  });

  it('applies fixed discounts, capped at subtotal', () => {
    const col = buildPricingRolesColumn({ roles, discount_type: 'fixed', discount_amount: 2000 });
    expect(col.discount_total).toBe(2000);
    expect(col.total_amount).toBe(12500 - 2000);

    const capped = buildPricingRolesColumn({ roles, discount_type: 'fixed', discount_amount: 999999 });
    expect(capped.discount_total).toBe(12500);
    expect(capped.total_amount).toBe(0);
  });

  it('applies percentage discounts', () => {
    const col = buildPricingRolesColumn({ roles, discount_type: 'percentage', discount_percentage: 10 });
    expect(col.discount_total).toBe(1250);
    expect(col.total_amount).toBe(11250);
  });

  it('produces the canonical empty object for missing/empty input', () => {
    for (const input of [undefined, null, {}]) {
      const col = buildPricingRolesColumn(input as never);
      expect(col.roles).toEqual([]);
      expect(col.subtotal).toBe(0);
      expect(col.discount_total).toBe(0);
      expect(col.total_amount).toBe(0);
      expect(col.discount_type).toBe('none');
    }
  });

  it('treats non-numeric rate/hours as 0 instead of NaN', () => {
    const col = buildPricingRolesColumn({
      roles: [{ role: 'X', ratePerHour: 'abc' as unknown as number, totalHours: 10 }],
    });
    expect(col.subtotal).toBe(0);
    expect(Number.isNaN(col.total_amount)).toBe(false);
  });
});
