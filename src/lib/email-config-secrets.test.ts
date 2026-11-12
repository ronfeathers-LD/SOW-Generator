import { describe, it, expect, beforeAll } from 'vitest';
import { encryptSecret, isEncrypted, decryptSecret } from './crypto-utils';
import {
  stripEmailConfigSecrets,
  secretsForSave,
  decryptEmailSecrets,
  plaintextSecretsToEncrypt,
} from './email-config-secrets';

beforeAll(() => {
  process.env.SF_CRED_ENCRYPTION_KEY = 'b'.repeat(64);
});

describe('stripEmailConfigSecrets', () => {
  it('never hands the password or API key to the page, only whether one is saved', () => {
    const safe = stripEmailConfigSecrets({
      id: 1, provider: 'gmail', username: 'sow@leandata.com', password: 'abcd efgh ijkl mnop', api_key: null,
    });
    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('api_key');
    expect(safe.has_password).toBe(true);
    expect(safe.has_api_key).toBe(false);
    expect(safe.username).toBe('sow@leandata.com');
  });
});

describe('secretsForSave', () => {
  it('stores a newly typed password encrypted', () => {
    const out = secretsForSave({ password: 'abcd efgh ijkl mnop' }, null);
    expect(isEncrypted(out.password)).toBe(true);
    expect(decryptSecret(out.password)).toBe('abcd efgh ijkl mnop');
  });

  it('keeps the saved password when the field is left blank, encrypting it if it was plaintext', () => {
    const out = secretsForSave({ password: '' }, { password: 'legacy plain', api_key: null });
    expect(isEncrypted(out.password)).toBe(true);
    expect(decryptSecret(out.password)).toBe('legacy plain');
    expect(out.api_key).toBeNull();
  });

  it('does not double-encrypt an already encrypted saved password', () => {
    const stored = encryptSecret('kept');
    expect(secretsForSave({}, { password: stored }).password).toBe(stored);
  });
});

describe('plaintextSecretsToEncrypt', () => {
  it('returns the encrypted columns for a row still holding plaintext', () => {
    const update = plaintextSecretsToEncrypt({ password: 'legacy plain', api_key: null });
    expect(update).not.toBeNull();
    expect(isEncrypted(update!.password)).toBe(true);
    expect(decryptSecret(update!.password)).toBe('legacy plain');
    expect(update).not.toHaveProperty('api_key');
  });

  it('returns null when everything is already encrypted', () => {
    expect(plaintextSecretsToEncrypt({ password: encryptSecret('x'), api_key: null })).toBeNull();
  });
});

describe('decryptEmailSecrets', () => {
  it('reads both encrypted and legacy plaintext values', () => {
    expect(decryptEmailSecrets({ password: encryptSecret('s3cret') }).password).toBe('s3cret');
    expect(decryptEmailSecrets({ password: 'legacy plain' }).password).toBe('legacy plain');
  });
});
