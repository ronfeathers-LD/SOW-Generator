import { decryptSecret, encryptSecretIfPlain, isEncrypted } from './crypto-utils';

// The email config's Gmail app password and provider API key are stored
// encrypted at rest, the same way as the Salesforce credentials (audit #92).
// Rows written before this change hold plaintext; decryptSecret still reads
// them, and getEmailService re-saves them encrypted the first time it loads.

const SECRET_FIELDS = ['password', 'api_key'] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

type Row = Record<string, unknown>;

/**
 * The config as the admin page may see it: secrets removed, replaced by
 * has_password / has_api_key flags so the form can say one is saved.
 */
export function stripEmailConfigSecrets<T extends Row>(config: T): Omit<T, SecretField> & {
  has_password: boolean;
  has_api_key: boolean;
} {
  const { password, api_key, ...rest } = config as Row;
  return {
    ...(rest as Omit<T, SecretField>),
    has_password: typeof password === 'string' && password.length > 0,
    has_api_key: typeof api_key === 'string' && api_key.length > 0,
  };
}

/**
 * The secret values to store for a save. A blank field means "keep the saved
 * one" (the page never receives the saved secret, so it cannot send it back).
 * Every returned value is encrypted.
 */
export function secretsForSave(
  input: { password?: string | null; api_key?: string | null },
  existing: { password?: string | null; api_key?: string | null } | null,
): { password: string | null; api_key: string | null } {
  const pick = (field: SecretField): string | null => {
    const typed = input[field];
    if (typeof typed === 'string' && typed.length > 0) return encryptSecretIfPlain(typed);
    const saved = existing?.[field];
    if (typeof saved === 'string' && saved.length > 0) return encryptSecretIfPlain(saved);
    return null;
  };
  return { password: pick('password'), api_key: pick('api_key') };
}

/** Plaintext secrets for sending mail. */
export function decryptEmailSecrets(config: { password?: string | null; api_key?: string | null }): {
  password: string;
  apiKey: string;
} {
  return { password: decryptSecret(config.password), apiKey: decryptSecret(config.api_key) };
}

/**
 * Columns to re-save for a row still holding a plaintext secret, or null when
 * nothing needs encrypting.
 */
export function plaintextSecretsToEncrypt(config: {
  password?: string | null;
  api_key?: string | null;
}): Partial<Record<SecretField, string>> | null {
  const update: Partial<Record<SecretField, string>> = {};
  for (const field of SECRET_FIELDS) {
    const value = config[field];
    if (typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
      update[field] = encryptSecretIfPlain(value);
    }
  }
  return Object.keys(update).length > 0 ? update : null;
}
