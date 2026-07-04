import { describe, it, expect } from 'vitest';
import { runAutomatedChecks, type ChecklistSOWData } from './pre-submit-checks';

function tenantsResult(salesforce_tenants: string | undefined) {
  const sow = { salesforce_tenants } as ChecklistSOWData;
  const entry = runAutomatedChecks(sow).find((e) => e.item.id === 'tenants-check');
  return entry!.result;
}

describe('pre-submit tenants-check (#200)', () => {
  it('passes when tenants is greater than 1', () => {
    expect(tenantsResult('2').passed).toBe(true);
    expect(tenantsResult('10').passed).toBe(true);
  });

  it('fails when tenants is exactly 1 (sandbox reminder)', () => {
    const r = tenantsResult('1');
    expect(r.passed).toBe(false);
    expect(r.detail).toContain('sandbox');
  });

  it('fails for 0, blank, and non-numeric instead of silently passing', () => {
    expect(tenantsResult('0').passed).toBe(false);
    expect(tenantsResult('').passed).toBe(false);
    expect(tenantsResult(undefined).passed).toBe(false);
    expect(tenantsResult('abc').passed).toBe(false);
  });

  it('does not read a trailing-garbage number as valid (parseInt bug)', () => {
    // parseInt('1abc') === 1; Number('1abc') === NaN → correctly fails.
    expect(tenantsResult('1abc').passed).toBe(false);
  });
});
