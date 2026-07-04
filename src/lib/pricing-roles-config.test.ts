import { describe, it, expect } from 'vitest';
import { getDefaultRateForRole, type PricingRoleConfig } from './pricing-roles-config';

const configs: PricingRoleConfig[] = [
  { role_name: 'Consultant', default_rate: 250, is_active: true },
  { role_name: 'Free Role', default_rate: 0, is_active: true },
  { role_name: 'Account Executive', default_rate: 0, is_active: true },
];

describe('getDefaultRateForRole', () => {
  it('returns the configured rate for a known role', () => {
    expect(getDefaultRateForRole('Consultant', configs)).toBe(250);
  });

  it('respects a legitimate $0 configured rate (regression for #168)', () => {
    // `|| 250` would have silently billed this role at $250/hr.
    expect(getDefaultRateForRole('Free Role', configs)).toBe(0);
  });

  it('always returns 0 for Account Executive (excluded from final pricing)', () => {
    expect(getDefaultRateForRole('Account Executive', configs)).toBe(0);
  });

  it('defaults to 250 for an unconfigured role', () => {
    expect(getDefaultRateForRole('Unknown Role', configs)).toBe(250);
  });
});
