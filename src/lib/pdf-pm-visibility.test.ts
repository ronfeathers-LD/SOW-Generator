import { it, expect } from 'vitest';
import { getPricingSummary } from '@/lib/sow/pricing-summary';

it('PM is shown iff a PM row with hours exists, regardless of flag', () => {
  const withPM = getPricingSummary({ roles: [{ role: 'Project Manager', totalHours: 16, ratePerHour: 250 }], discount_type: 'none' });
  const noPM = getPricingSummary({ roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' });
  expect(withPM.pmIncluded).toBe(true);
  expect(noPM.pmIncluded).toBe(false);
});
