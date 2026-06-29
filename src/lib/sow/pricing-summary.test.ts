import { describe, it, expect } from 'vitest';
import { getPricingSummary } from './pricing-summary';

describe('getPricingSummary', () => {
  const obj = {
    roles: [
      { role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 },
      { role: 'Project Manager', totalHours: 16, ratePerHour: 250 },
    ],
    discount_type: 'none',
  };

  it('sums rows into subtotal/total and reports pmIncluded', () => {
    const s = getPricingSummary(obj);
    expect(s.subtotal).toBe((27 + 16) * 250);
    expect(s.total).toBe((27 + 16) * 250);
    expect(s.totalHours).toBe(43);
    expect(s.pmIncluded).toBe(true);
  });

  it('pmIncluded is false when no PM row (or PM hours 0)', () => {
    const s = getPricingSummary({ roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' });
    expect(s.pmIncluded).toBe(false);
    expect(s.total).toBe(35 * 250);
  });

  it('applies fixed and percentage discounts like the server', () => {
    const fixed = getPricingSummary({ roles: [{ role: 'X', totalHours: 10, ratePerHour: 100 }], discount_type: 'fixed', discount_amount: 300 });
    expect(fixed.discountTotal).toBe(300);
    expect(fixed.total).toBe(700);
    const pct = getPricingSummary({ roles: [{ role: 'X', totalHours: 10, ratePerHour: 100 }], discount_type: 'percentage', discount_percentage: 10 });
    expect(pct.discountTotal).toBe(100);
    expect(pct.total).toBe(900);
  });

  it('handles the legacy bare-array shape', () => {
    const s = getPricingSummary([{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }]);
    expect(s.pmIncluded).toBe(false);
    expect(s.total).toBe(8750);
  });
});
