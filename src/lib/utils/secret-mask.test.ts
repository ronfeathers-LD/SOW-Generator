import { describe, it, expect } from 'vitest';
import { MASKED_SECRET, isMaskedSecret, maskSecret, resolveSecretInput } from './secret-mask';

describe('secret-mask (#53)', () => {
  it('maskSecret masks configured secrets and passes through absent ones', () => {
    expect(maskSecret('xoxb-real-token')).toBe(MASKED_SECRET);
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
    expect(maskSecret(undefined)).toBe('');
  });

  it('isMaskedSecret recognizes the placeholder and variants', () => {
    expect(isMaskedSecret(MASKED_SECRET)).toBe(true);
    expect(isMaskedSecret('••••1234')).toBe(true);
    expect(isMaskedSecret('xoxb-real-token')).toBe(false);
    expect(isMaskedSecret(undefined)).toBe(false);
    expect(isMaskedSecret(42)).toBe(false);
  });

  it('resolveSecretInput prefers a newly-typed value', () => {
    expect(resolveSecretInput('new-secret', 'stored-secret')).toBe('new-secret');
  });

  it('resolveSecretInput keeps the stored secret on masked or blank input', () => {
    expect(resolveSecretInput(MASKED_SECRET, 'stored-secret')).toBe('stored-secret');
    expect(resolveSecretInput('', 'stored-secret')).toBe('stored-secret');
    expect(resolveSecretInput('   ', 'stored-secret')).toBe('stored-secret');
    expect(resolveSecretInput(undefined, 'stored-secret')).toBe('stored-secret');
  });

  it('resolveSecretInput returns null when nothing usable exists', () => {
    expect(resolveSecretInput('', '')).toBeNull();
    expect(resolveSecretInput(MASKED_SECRET, undefined)).toBeNull();
    expect(resolveSecretInput(undefined, MASKED_SECRET)).toBeNull();
  });
});
