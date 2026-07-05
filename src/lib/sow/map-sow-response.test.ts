import { describe, expect, it } from 'vitest';
import { mapSowRowToResponse } from './map-sow-response';

// Minimal row: only the fields the mapper reads. Cast keeps the test honest
// about what we assert without fabricating the full sows row.
function rowWith(overrides: Record<string, unknown>) {
  return { id: 'test-id', ...overrides } as Parameters<typeof mapSowRowToResponse>[0];
}

describe('mapSowRowToResponse tenant/timeline/regions defaults', () => {
  it('passes empty values through instead of injecting the 999 sentinel', () => {
    const result = mapSowRowToResponse(
      rowWith({ regions: '', salesforce_tenants: '', timeline_weeks: '' })
    );
    expect(result.template.regions).toBe('');
    expect(result.template.salesforce_tenants).toBe('');
    expect(result.template.timeline_weeks).toBe('');
  });

  it('passes real values through unchanged', () => {
    const result = mapSowRowToResponse(
      rowWith({ regions: '2', salesforce_tenants: '3', timeline_weeks: '12' })
    );
    expect(result.template.salesforce_tenants).toBe('3');
    expect(result.template.timeline_weeks).toBe('12');
  });
});

describe('mapSowRowToResponse payment_terms', () => {
  it('passes an empty payment_terms through as empty (no sentinel default)', () => {
    const result = mapSowRowToResponse(rowWith({ payment_terms: '' }));
    expect(result.payment_terms).toBe('');
  });

  it('passes a real payment_terms value through unchanged', () => {
    const result = mapSowRowToResponse(
      rowWith({ payment_terms: 'Billed monthly, as incurred; payment due upon receipt.' })
    );
    expect(result.payment_terms).toBe(
      'Billed monthly, as incurred; payment due upon receipt.'
    );
  });

  it('defaults a missing payment_terms column to empty string', () => {
    const result = mapSowRowToResponse(rowWith({}));
    expect(result.payment_terms).toBe('');
  });
});
