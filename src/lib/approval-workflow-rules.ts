/**
 * Check if an SOW requires PM approval.
 *
 * PM approval is required whenever the SOW currently has Project Manager hours
 * (> 0). This is authoritative on the actual pricing_roles — it deliberately
 * does NOT short-circuit on the pm_hours_requirement_disabled waiver flag.
 *
 * The waiver flag is only legitimately set when PM hours were actually removed
 * (hours stripped to 0, which already yields false here). A *stale* waiver left
 * over after PM hours are re-added must not silently skip the PM approval stage
 * (audit #48 — the flag was sticky and only ever cleared by reverseRequest).
 */
interface PricingRoleEntry {
  role?: string;
  totalHours?: number | string;
}

type PricingRolesField =
  | Array<PricingRoleEntry>
  | { roles?: Array<PricingRoleEntry> }
  | null
  | undefined;

function extractPricingRolesArray(field: PricingRolesField): PricingRoleEntry[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (Array.isArray(field.roles)) return field.roles;
  return [];
}

export function requiresPMApproval(sow: {
  products?: string[];
  pricing_roles?: PricingRolesField;
  pm_hours_requirement_disabled?: boolean;
}): boolean {
  const roles = extractPricingRolesArray(sow.pricing_roles);
  const pmRole = roles.find(r => r.role === 'Project Manager');
  const pmHoursRaw = pmRole?.totalHours;
  const pmHours = typeof pmHoursRaw === 'number'
    ? pmHoursRaw
    : typeof pmHoursRaw === 'string'
      ? parseFloat(pmHoursRaw) || 0
      : 0;

  // Authoritative on actual PM hours — a stale waiver flag must not skip this.
  return pmHours > 0;
}


/**
 * The approvals line for the submit-for-review Slack post and email, naming the
 * stages this SOW actually needs. Without it every submit read as a PMO ask,
 * including SOWs with no Project Manager hours that never get a PMO stage.
 */
export function describeRequiredApprovals(sow: {
  pricing_roles?: PricingRolesField;
}): string {
  return requiresPMApproval(sow)
    ? 'Professional Services, Project Management (PMO), Sr. Leadership'
    : 'Professional Services, Sr. Leadership. No PMO review needed (no Project Manager hours).';
}
