export type PricingSummaryRole = { role: string; hours: number; rate: number; cost: number };
export type PricingSummary = {
  roles: PricingSummaryRole[];
  subtotal: number;
  discountTotal: number;
  total: number;
  totalHours: number;
  pmIncluded: boolean;
};

const toNum = (v: unknown): number =>
  typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0;

export function getPricingSummary(pricingRoles: unknown): PricingSummary {
  const isObjectForm =
    !!pricingRoles && typeof pricingRoles === 'object' && !Array.isArray(pricingRoles);
  const container = isObjectForm ? (pricingRoles as Record<string, unknown>) : null;
  const rawRoles = Array.isArray(pricingRoles)
    ? (pricingRoles as Record<string, unknown>[])
    : Array.isArray(container?.roles)
      ? (container!.roles as Record<string, unknown>[])
      : [];

  const roles: PricingSummaryRole[] = rawRoles.map((r) => {
    const hours = toNum(r.totalHours);
    const rate = toNum(r.ratePerHour);
    return { role: String(r.role ?? ''), hours, rate, cost: hours * rate };
  });

  const subtotal = roles.reduce((sum, r) => sum + r.cost, 0);
  const totalHours = roles.reduce((sum, r) => sum + r.hours, 0);

  const discountType = (container?.discount_type as string) || 'none';
  let discountTotal = 0;
  if (discountType === 'fixed') {
    discountTotal = Math.min(subtotal, toNum(container?.discount_amount));
  } else if (discountType === 'percentage') {
    discountTotal = subtotal * (toNum(container?.discount_percentage) / 100);
  }
  const total = Math.max(0, subtotal - discountTotal);

  const pmIncluded = roles.some((r) => r.role === 'Project Manager' && r.hours > 0);

  return { roles, subtotal, discountTotal, total, totalHours, pmIncluded };
}
