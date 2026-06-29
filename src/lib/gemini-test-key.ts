/**
 * Resolve which Gemini API key the "Test Connection" admin action should use.
 *
 * The admin panel may send a masked placeholder (the bullet string returned by
 * the config POST/PUT responses) when the user hasn't re-typed the key, or an
 * empty value. In those cases we fall back to the stored active key so the test
 * exercises the real configured key rather than failing on a mask.
 *
 * Returns null when there is no usable key to test with.
 */
export function resolveGeminiTestKey(
  providedKey: string | undefined,
  storedKey: string | undefined
): string | null {
  const isMasked = (k: string) => k.includes('•') || k.includes('·');
  const provided = providedKey?.trim();

  if (provided && !isMasked(provided)) {
    return provided;
  }

  const stored = storedKey?.trim();
  if (stored && !isMasked(stored)) {
    return stored;
  }

  return null;
}
