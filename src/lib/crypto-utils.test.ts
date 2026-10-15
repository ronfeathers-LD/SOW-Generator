import { describe, it, expect, beforeAll } from 'vitest';
import { decryptSecret, encryptSecret, encryptSecretIfPlain, isEncrypted } from './crypto-utils';

beforeAll(() => {
  process.env.SF_CRED_ENCRYPTION_KEY = 'a'.repeat(64);
});

describe('encryptSecretIfPlain', () => {
  it('encrypts a plaintext secret', () => {
    const stored = encryptSecretIfPlain('hunter2');
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptSecret(stored)).toBe('hunter2');
  });

  it('leaves an already-encrypted secret alone, so re-saving does not double-encrypt', () => {
    const once = encryptSecret('token123');
    const resaved = encryptSecretIfPlain(once);
    expect(resaved).toBe(once);
    expect(decryptSecret(resaved)).toBe('token123');
  });
});
