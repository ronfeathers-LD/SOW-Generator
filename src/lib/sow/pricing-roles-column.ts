/**
 * Canonical shape of the `sows.pricing_roles` JSONB column (audit #104).
 *
 * Historically the column held two incompatible shapes: the create path wrote
 * a bare roles array while the Pricing tab wrote a structured object, forcing
 * every reader to branch on Array.isArray. The object form is canonical:
 * every writer goes through buildPricingRolesColumn, and migration 031
 * backfills pre-existing array/null rows. Readers keep tolerating the legacy
 * array form as defense-in-depth, but no new array rows are ever written.
 */

export interface PricingRolesColumn {
  roles: Array<{ role: string; ratePerHour: number; totalHours: number; [key: string]: unknown }>;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  discount_type: string;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  auto_calculated?: boolean;
  last_calculated?: string;
}

export interface PricingInput {
  roles?: Array<{ role: string; ratePerHour: number; totalHours: number; [key: string]: unknown }>;
  discount_type?: string;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  auto_calculated?: boolean;
  last_calculated?: string;
}

/**
 * Build the canonical pricing_roles column value from client-supplied pricing
 * data. Monetary totals are always recomputed server-side from roles + the
 * discount config — client-supplied subtotal/discount_total/total_amount are
 * never trusted (audit #88). Formula matches PricingRolesAndDiscount.tsx.
 */
export function buildPricingRolesColumn(pricing?: PricingInput | null): PricingRolesColumn {
  const roles = pricing?.roles || [];
  const discountType = pricing?.discount_type || 'none';

  const subtotal = roles.reduce(
    (sum, r) => sum + (Number(r.ratePerHour) || 0) * (Number(r.totalHours) || 0),
    0
  );

  let discountTotal = 0;
  if (discountType === 'fixed') {
    discountTotal = Math.min(subtotal, Number(pricing?.discount_amount) || 0);
  } else if (discountType === 'percentage') {
    discountTotal = subtotal * ((Number(pricing?.discount_percentage) || 0) / 100);
  }

  const column: PricingRolesColumn = {
    roles,
    subtotal,
    discount_total: discountTotal,
    total_amount: Math.max(0, subtotal - discountTotal),
    discount_type: discountType,
    discount_amount: pricing?.discount_amount,
    discount_percentage: pricing?.discount_percentage,
  };

  if (pricing?.auto_calculated !== undefined) column.auto_calculated = pricing.auto_calculated;
  if (pricing?.last_calculated !== undefined) column.last_calculated = pricing.last_calculated;

  return column;
}
