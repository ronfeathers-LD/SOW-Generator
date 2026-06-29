import { describe, it, expect } from 'vitest';
import { getPricingSummary, toPricingRolesObject } from '@/lib/sow/pricing-summary';

// Pins the contract the editor (PricingRolesAndDiscount / BillingPaymentTab) must
// honor: the Project Summary and PM-inclusion are derived from the stored pricing
// table via getPricingSummary(toPricingRolesObject(...)), NOT from a live formula.

describe('editor pricing-summary binding', () => {
  it('editor summary shows no PM and no deduction when PM row absent', () => {
    const pricingRoles = [
      { id: '1', role: 'Onboarding Specialist', ratePerHour: 250, defaultRate: 250, totalHours: 35, totalCost: 8750 },
    ];
    const discountConfig = { type: 'none' as const };

    const s = getPricingSummary(toPricingRolesObject(pricingRoles, discountConfig));

    expect(s.pmIncluded).toBe(false); // panel renders PM/deduction lines ONLY when true
    expect(s.total).toBe(8750);
    expect(s.totalHours).toBe(35);
    expect(s.roles).toHaveLength(1);
  });

  it('reports pmIncluded and table totals when a PM row with hours exists, applying the table discount', () => {
    const pricingRoles = [
      { id: '1', role: 'Onboarding Specialist', ratePerHour: 250, defaultRate: 250, totalHours: 27, totalCost: 6750 },
      { id: '2', role: 'Project Manager', ratePerHour: 250, defaultRate: 250, totalHours: 16, totalCost: 4000 },
    ];
    const discountConfig = { type: 'percentage' as const, percentage: 10 };

    const s = getPricingSummary(toPricingRolesObject(pricingRoles, discountConfig));

    expect(s.pmIncluded).toBe(true);
    expect(s.subtotal).toBe((27 + 16) * 250);
    expect(s.discountTotal).toBe(((27 + 16) * 250) * 0.1);
    expect(s.total).toBe(((27 + 16) * 250) * 0.9);
    expect(s.totalHours).toBe(43);
  });

  it('treats a PM row with zero hours as PM-not-included (no stranded deduction)', () => {
    const pricingRoles = [
      { id: '1', role: 'Onboarding Specialist', ratePerHour: 250, defaultRate: 250, totalHours: 35, totalCost: 8750 },
      { id: '2', role: 'Project Manager', ratePerHour: 250, defaultRate: 250, totalHours: 0, totalCost: 0 },
    ];

    const s = getPricingSummary(toPricingRolesObject(pricingRoles, { type: 'none' as const }));

    expect(s.pmIncluded).toBe(false);
    expect(s.total).toBe(8750);
  });
});
