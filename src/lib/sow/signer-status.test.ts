import { describe, it, expect } from 'vitest';
import {
  hasCustomerSigner,
  missingCustomerSignerFields,
  customerSignerWarning,
} from './signer-status';

describe('customer signer presence', () => {
  it('treats a fully filled signer as present', () => {
    const signer = { name: 'Dana Reyes', title: 'VP RevOps' };
    expect(hasCustomerSigner(signer)).toBe(true);
    expect(missingCustomerSignerFields(signer)).toEqual([]);
    expect(customerSignerWarning(signer)).toBeNull();
  });

  it('flags a fully blank signer', () => {
    expect(missingCustomerSignerFields({})).toEqual(['name', 'title']);
    expect(customerSignerWarning({})).toMatch(/both the signer name and title are blank/);
  });

  it('treats whitespace-only values as blank', () => {
    expect(hasCustomerSigner({ name: '   ', title: '  ' })).toBe(false);
  });

  it('flags a missing title on its own', () => {
    expect(missingCustomerSignerFields({ name: 'Dana Reyes' })).toEqual(['title']);
    expect(customerSignerWarning({ name: 'Dana Reyes' })).toBe(
      'The customer signer title is blank.'
    );
  });

  it('flags a missing name on its own', () => {
    expect(customerSignerWarning({ title: 'VP RevOps' })).toBe(
      'The customer signer name is blank.'
    );
  });

  it('tolerates nulls from the database', () => {
    expect(hasCustomerSigner({ name: null, title: null })).toBe(false);
  });
});
