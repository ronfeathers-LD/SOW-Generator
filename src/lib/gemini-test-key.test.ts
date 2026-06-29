import { describe, it, expect } from 'vitest';
import { resolveGeminiTestKey } from './gemini-test-key';

describe('resolveGeminiTestKey', () => {
  const stored = 'AIzaSyStoredRealKey1234567890';

  it('uses the provided key when it is a real (non-masked) value', () => {
    expect(resolveGeminiTestKey('AIzaSyProvidedKey0987654321', stored)).toBe(
      'AIzaSyProvidedKey0987654321'
    );
  });

  it('falls back to the stored key when the provided key is masked', () => {
    // The config POST/PUT responses return this bullet placeholder, which the
    // admin page may still hold in state when the user clicks Test.
    expect(resolveGeminiTestKey('••••••••••••••••', stored)).toBe(stored);
  });

  it('falls back to the stored key when the provided key is empty/undefined', () => {
    expect(resolveGeminiTestKey('', stored)).toBe(stored);
    expect(resolveGeminiTestKey(undefined, stored)).toBe(stored);
  });

  it('returns null when neither a usable provided key nor a stored key exists', () => {
    expect(resolveGeminiTestKey('••••', undefined)).toBeNull();
    expect(resolveGeminiTestKey('', '')).toBeNull();
    expect(resolveGeminiTestKey(undefined, undefined)).toBeNull();
  });
});
