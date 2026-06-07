import crypto from 'crypto';

// AES-256-GCM at-rest encryption for stored secrets (e.g. Salesforce creds).
// Encrypted values are prefixed so decryptSecret can pass through legacy
// plaintext untouched during/after migration. (audit #92)
const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.SF_CRED_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('SF_CRED_ENCRYPTION_KEY is not set — cannot encrypt/decrypt secrets');
  }
  // Accept a 64-char hex key, a 32-byte base64 key, or any string (hashed to 32 bytes).
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const b64 = Buffer.from(raw, 'base64');
  if (b64.length === 32) return b64;
  return crypto.createHash('sha256').update(raw).digest();
}

/** Encrypt a secret for storage. Requires SF_CRED_ENCRYPTION_KEY. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt a stored secret. Backwards-compatible: a value without the encrypted
 * prefix is treated as legacy plaintext and returned as-is (no key required), so
 * existing rows keep working until they're re-saved encrypted.
 */
export function decryptSecret(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '';
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  const key = getKey();
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** Whether a stored value is already encrypted. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
