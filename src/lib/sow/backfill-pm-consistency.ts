/**
 * Pure classifier for detecting SOWs left in an inconsistent PM-removal state.
 *
 * "Stranded deduction" class: an Onboarding Specialist row carries less than
 * baseProjectHours (OS = base − pmHours/2 instead of base) but no Project
 * Manager row exists to account for the missing half, and
 * pm_hours_requirement_disabled is still false. This can happen either because
 * the PM row was deleted without restoring OS, or because the deduction was
 * applied and a PM row was never written in the first place (the GWI
 * incident — see classifySow's doc comment for why this check is
 * deliberately independent of `shouldAddProjectManager`).
 *
 * This module has NO side-effects and NO database I/O. It is consumed by
 * scripts/backfill-pm-removal-consistency.js to identify and fix affected rows.
 */

import { calculateAllHours } from '@/lib/hours-calculation-utils';
import type { SegmentRulesMap } from '@/lib/segment-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassifyResult {
  action: 'none' | 'restore-os-set-flag';
  /** Correct OS hours after healing (= baseProjectHours). Present when action !== 'none'. */
  osTarget?: number;
  /** How many PM hours were originally removed. Present when action !== 'none'. */
  pmHoursRemoved?: number;
}

interface PricingRoleRow {
  role?: string;
  totalHours?: number | string;
  ratePerHour?: number | string;
}

/** Minimal SOW row shape the classifier needs. All fields are optional so the
 *  function never throws on a partially-hydrated row from a database fetch. */
export interface SowRowInput {
  account_segment?: string | null;
  pm_hours_requirement_disabled?: boolean | null;
  products?: string[] | null;
  number_of_units?: string | null;
  orchestration_units?: string | null;
  bookit_forms_units?: string | null;
  bookit_links_units?: string | null;
  bookit_handoff_units?: string | null;
  other_products_units?: string | null;
  units_consumption?: string | null;
  pricing_roles?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

/**
 * Extract the roles array regardless of whether pricing_roles is the bare-array
 * legacy shape or the current object shape { roles: [...], ... }.
 */
function extractRoles(pricingRoles: unknown): PricingRoleRow[] {
  if (!pricingRoles) return [];
  if (Array.isArray(pricingRoles)) return pricingRoles as PricingRoleRow[];
  const container = pricingRoles as Record<string, unknown>;
  return Array.isArray(container.roles) ? (container.roles as PricingRoleRow[]) : [];
}

/**
 * Extract `auto_calculated` from the object-shape pricing_roles column
 * (`{ roles, ..., auto_calculated }` — see migration 031 and
 * BillingPaymentTab's write-back). Returns `undefined` for the legacy
 * bare-array shape or when the flag isn't present, matching the "no record of
 * a manual edit" convention `recalculateNeedsConfirm` uses client-side.
 */
function extractAutoCalculated(pricingRoles: unknown): boolean | undefined {
  if (!pricingRoles || Array.isArray(pricingRoles) || typeof pricingRoles !== 'object') {
    return undefined;
  }
  const container = pricingRoles as Record<string, unknown>;
  return typeof container.auto_calculated === 'boolean' ? container.auto_calculated : undefined;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify a single SOW row and return the required backfill action.
 *
 * Returns `{ action: 'none' }` for SOWs that are already consistent:
 *   - pm_hours_requirement_disabled is already true
 *   - a Project Manager row is present in pricing_roles
 *   - pricing_roles.auto_calculated is explicitly false (a manual edit
 *     explains a below-base OS value on its own; not our bug to "fix")
 *   - the Onboarding Specialist's hours are at or above base (clean removal,
 *     or a SOW that was never priced at all)
 *
 * Returns `{ action: 'restore-os-set-flag', osTarget, pmHoursRemoved }` for
 * SOWs that are stranded: no PM row and OS hours are below base — meaning the
 * deduction was applied but never reversed.
 *
 * Deliberately independent of `shouldAddProjectManager`: an Onboarding
 * Specialist row with `0 < hours < baseProjectHours` and no Project Manager
 * row is inconsistent whether or not PM is warranted TODAY, because with no
 * PM row the OS should always carry the full base — that's true regardless of
 * whether the current product/unit mix happens to warrant a PM. Gating on
 * `shouldAddProjectManager` used to make this classifier blind to exactly the
 * SOWs stranded by the BookIt-Links product-count bug (hours-calculation-utils
 * defect B): those SOWs had the deduction applied while PM incorrectly looked
 * warranted (Links wasn't excluded from the product count), and now that the
 * bug is fixed, `shouldAddProjectManager` correctly evaluates to false for
 * them — so the old early return would have frozen them at the wrong number
 * forever instead of healing them. See the GWI production incident (SOW
 * dbe7bba9-39ce-43f5-bcb4-f141d6d71ffc, v3).
 *
 * @param rules Segment rules (extra hours per segment) used to reconstruct
 *   baseProjectHours exactly as the SOW form would have computed it at the
 *   time. Callers with a Supabase client in scope should load these via
 *   `loadSegmentRules(supabase)`.
 */
export function classifySow(sow: SowRowInput, rules: SegmentRulesMap): ClassifyResult {
  // Already flagged → consistent, nothing to do.
  if (sow.pm_hours_requirement_disabled) {
    return { action: 'none' };
  }

  const roles = extractRoles(sow.pricing_roles);
  const hasPMRow = roles.some(r => r.role === 'Project Manager');

  // PM row is present → pricing is correct (PM removal, if any, is the
  // explicit flow's job — this classifier never second-guesses a present row).
  if (hasPMRow) {
    return { action: 'none' };
  }

  // A manual edit (auto_calculated === false) explains a below-base OS value
  // on its own — don't flag hand-tuned pricing as stranded.
  if (extractAutoCalculated(sow.pricing_roles) === false) {
    return { action: 'none' };
  }

  // No PM row.  Check whether the OS carries a stale deduction.
  //
  // Guard: only flag SOWs where an OS row ACTUALLY EXISTS with hours > 0.
  // When pricing is empty or the OS row is absent, currentOsHours resolves to 0
  // (< base), which would be a false positive — those SOWs were never priced,
  // not stranded.  See dry-run evidence: 9 of 11 flagged SOWs had OS = 0.
  const osRole = roles.find(r => r.role === 'Onboarding Specialist');
  const currentOsHours = toNum(osRole?.totalHours);

  if (!osRole || currentOsHours <= 0) {
    return { action: 'none' };
  }

  // Reconstruct the template-like object from top-level SOW columns — exactly
  // the same fields the SOW form passes to calculateAllHours — only once we
  // know we might need baseProjectHours (the checks above are cheap and don't
  // need it).
  const template = {
    products: sow.products ?? [],
    number_of_units: sow.number_of_units ?? undefined,
    orchestration_units: sow.orchestration_units ?? undefined,
    bookit_forms_units: sow.bookit_forms_units ?? undefined,
    bookit_links_units: sow.bookit_links_units ?? undefined,
    bookit_handoff_units: sow.bookit_handoff_units ?? undefined,
    other_products_units: sow.other_products_units ?? undefined,
    units_consumption: sow.units_consumption ?? undefined,
  };

  const { baseProjectHours } = calculateAllHours(template, sow.account_segment ?? undefined, rules);

  if (currentOsHours < baseProjectHours) {
    // OS hours are below base → PM was stripped (or the deduction was applied
    // without a PM row ever being written) without restoring OS.
    // pmHoursRemoved = (base - currentOsHours) * 2 because the deduction
    // applied to OS was pmHours / 2 (see calculateRoleHoursDistribution).
    const pmHoursRemoved = (baseProjectHours - currentOsHours) * 2;
    return {
      action: 'restore-os-set-flag',
      osTarget: baseProjectHours,
      pmHoursRemoved,
    };
  }

  // OS hours ≥ base → consistent (PM removed cleanly, or PM never warranted). No action.
  return { action: 'none' };
}
