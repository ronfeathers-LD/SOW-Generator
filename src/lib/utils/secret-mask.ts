/**
 * Shared handling for admin-configured secrets (Slack bot token / webhook,
 * Avoma API key, Gemini API key).
 *
 * Contract (established by the Gemini admin flow, PR #377):
 * - GET config responses never return the stored secret; they return
 *   MASKED_SECRET so the form shows "something is configured".
 * - Save (POST/PUT) treats a masked or blank incoming value as "keep the
 *   stored secret"; only a newly-typed value rotates it.
 * - Test endpoints fall back to the stored secret when the client sends a
 *   masked/blank value.
 */

export const MASKED_SECRET = '••••••••••••••••';

/** True when the value is the masked placeholder (or user-mangled variant). */
export function isMaskedSecret(value: unknown): boolean {
  return typeof value === 'string' && (value.includes('•') || value.includes('·'));
}

/** Mask a stored secret for a GET response: mask when set, '' when absent. */
export function maskSecret(stored: string | null | undefined): string {
  return stored ? MASKED_SECRET : '';
}

/**
 * Resolve the value to persist/use for a secret field on save or test.
 * A newly-typed (non-masked, non-blank) value wins; a masked or blank value
 * keeps the stored secret. Returns null when neither is usable.
 */
export function resolveSecretInput(
  provided: string | null | undefined,
  stored: string | null | undefined
): string | null {
  const p = provided?.trim();
  if (p && !isMaskedSecret(p)) {
    return p;
  }
  const s = stored?.trim();
  if (s && !isMaskedSecret(s)) {
    return s;
  }
  return null;
}
