/**
 * Returns true only when the user has hand-edited the pricing table since the
 * last auto-calculation — i.e. `auto_calculated` is explicitly `false`.
 *
 * `undefined` / missing means we have no record of a manual edit, so we treat
 * it as auto-calculated (no confirm needed).
 */
export function recalculateNeedsConfirm(
  pricing: { auto_calculated?: boolean } | undefined
): boolean {
  return pricing?.auto_calculated === false;
}
