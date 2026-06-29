/**
 * Pure classifier for detecting SOWs left in an inconsistent PM-removal state.
 *
 * "Stranded deduction" class: the PM row was deleted from pricing_roles but the
 * Onboarding Specialist was never restored to full base hours (OS = base − pmHours/2
 * instead of base), and pm_hours_requirement_disabled is still false.
 *
 * This module has NO side-effects and NO database I/O. It is consumed by
 * scripts/backfill-pm-removal-consistency.js to identify and fix affected rows.
 */

import { calculateAllHours } from '@/lib/hours-calculation-utils';

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

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify a single SOW row and return the required backfill action.
 *
 * Returns `{ action: 'none' }` for SOWs that are already consistent:
 *   - pm_hours_requirement_disabled is already true
 *   - the rule engine says PM is not required for this SOW
 *   - a Project Manager row is present in pricing_roles
 *   - the Onboarding Specialist's hours are at or above base (clean removal)
 *
 * Returns `{ action: 'restore-os-set-flag', osTarget, pmHoursRemoved }` for
 * SOWs that are stranded: no PM row, PM would be required, and OS hours are
 * below base — meaning the deduction was applied but never reversed.
 */
export function classifySow(sow: SowRowInput): ClassifyResult {
  // Already flagged → consistent, nothing to do.
  if (sow.pm_hours_requirement_disabled) {
    return { action: 'none' };
  }

  // Reconstruct the template-like object from top-level SOW columns — exactly
  // the same fields the SOW form passes to calculateAllHours.
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

  const { baseProjectHours, shouldAddProjectManager } = calculateAllHours(
    template,
    sow.account_segment ?? undefined
  );

  // Rule engine says PM is not required → no inconsistency possible.
  if (!shouldAddProjectManager) {
    return { action: 'none' };
  }

  const roles = extractRoles(sow.pricing_roles);
  const hasPMRow = roles.some(r => r.role === 'Project Manager');

  // PM row is present → pricing is correct.
  if (hasPMRow) {
    return { action: 'none' };
  }

  // No PM row but PM is required.  Check whether the OS carries the deduction.
  //
  // Guard: only flag SOWs where an OS row ACTUALLY EXISTS with hours > 0.
  // When pricing is empty or the OS row is absent, currentOsHours resolves to 0
  // (< base), which would be a false positive — those SOWs were never priced,
  // not stranded.  See dry-run evidence: 9 of 11 flagged SOWs had OS = 0.
  const osRole = roles.find(r => r.role === 'Onboarding Specialist');
  const currentOsHours = toNum(osRole?.totalHours);

  if (osRole && currentOsHours > 0 && currentOsHours < baseProjectHours) {
    // OS hours are below base → PM was stripped without restoring OS.
    // pmHoursRemoved = (base - currentOsHours) * 2 because the deduction
    // applied to OS was pmHours / 2 (see calculateRoleHoursDistribution).
    const pmHoursRemoved = (baseProjectHours - currentOsHours) * 2;
    return {
      action: 'restore-os-set-flag',
      osTarget: baseProjectHours,
      pmHoursRemoved,
    };
  }

  // OS hours ≥ base → PM was removed cleanly (OS already restored). No action.
  return { action: 'none' };
}
