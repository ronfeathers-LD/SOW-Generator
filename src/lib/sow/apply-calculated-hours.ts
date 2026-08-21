/**
 * Pure derivation of the pricing-roles table from an hours recalculation.
 *
 * Extracted from BillingPaymentTab's `autoCalculateHours` so the invariant
 * below is unit-testable without a React render.
 *
 * INVARIANT: the Onboarding Specialist deduction (baseProjectHours − pmHours/2)
 * is applied if and only if a Project Manager row carrying pmHours is present
 * in the returned array. The two halves of the PM-hours split must always
 * travel together.
 *
 * This is the fix for the GWI production incident (SOW
 * dbe7bba9-39ce-43f5-bcb4-f141d6d71ffc, v3): a prior fix for an earlier bug
 * (PM being silently re-added after an explicit removal) stopped
 * `autoCalculateHours` from ever writing the Project Manager row at all,
 * while leaving the Onboarding Specialist deduction in place. Any SOW where
 * PM was warranted but had no PM row yet (e.g. because it was never
 * recalculated after adding a product) silently lost `pmHours` from its
 * total — the deduction applied, the row that should carry those hours never
 * written.
 *
 * Re-adding the PM role here is safe again: PM "removed" state is read from
 * the flags the removal flows set, and both the enterprise self-serve and PMO
 * approval flows always set `pm_hours_requirement_disabled` (and
 * `pm_hours_removal_approved`) server-side in the same write that strips the
 * PM row (see `applyPMRemoval` in pm-hours-removal-service.ts) — so this
 * function honoring those flags can't resurrect a role the removal flow just
 * deleted.
 */

import { calculateRoleHoursDistribution } from '@/lib/hours-calculation-utils';
import { getDefaultRateForRole, getDescriptionForRole, type PricingRoleConfig } from '@/lib/pricing-roles-config';

export interface CalculatedPricingRole {
  id: string;
  role: string;
  description?: string;
  ratePerHour: number;
  defaultRate: number;
  totalHours: number;
  totalCost: number;
}

/** PM-removal flags as stored on the SOW row (SOWData). */
export interface PmRemovalState {
  pm_hours_requirement_disabled?: boolean;
  pm_hours_removed?: number;
  pm_hours_removal_approved?: boolean;
}

export interface ApplyCalculatedHoursParams<T extends CalculatedPricingRole = CalculatedPricingRole> {
  /** Current pricing roles table, in its current order. */
  roles: T[];
  baseProjectHours: number;
  pmHours: number;
  shouldAddProjectManager: boolean;
  pmRemoval: PmRemovalState;
  pricingRolesConfig: PricingRoleConfig[];
  /** Id generator for a newly-created role row. Defaults to the same scheme the form has always used. */
  generateId?: () => string;
}

const defaultGenerateId = (): string => Math.random().toString(36).substr(2, 9);

/** True when PM has been explicitly removed by one of the removal flows. */
function isPmRemoved(pmRemoval: PmRemovalState): boolean {
  return Boolean(
    pmRemoval.pm_hours_requirement_disabled ||
    pmRemoval.pm_hours_removal_approved ||
    (pmRemoval.pm_hours_removed ?? 0) > 0
  );
}

/**
 * Derive the new pricing-roles array for an hours recalculation.
 *
 * - PM warranted and not removed: Onboarding Specialist gets
 *   `baseProjectHours − pmHours/2`, and a Project Manager row carrying
 *   `pmHours` is ensured (added if absent, hours updated if present — its
 *   custom rate, if any, is preserved exactly as the OS branch preserves
 *   `role.ratePerHour`).
 * - PM not warranted, or PM explicitly removed: Onboarding Specialist gets
 *   the full `baseProjectHours`. An existing Project Manager row is left
 *   untouched — this function never deletes a role; that is the explicit
 *   removal flow's job (see `removePmRoleRestoringOs`). If PM is both
 *   "removed" and a PM row somehow still exists, that combination is a bug
 *   elsewhere (the removal flows strip the row in the same write that sets
 *   the flags) and is intentionally left alone rather than silently deleted.
 * - Every role that isn't Onboarding Specialist or Project Manager passes
 *   through unchanged, in its original position.
 */
export function applyCalculatedHours<T extends CalculatedPricingRole>(
  params: ApplyCalculatedHoursParams<T>
): T[] {
  const {
    roles,
    baseProjectHours,
    pmHours,
    shouldAddProjectManager,
    pmRemoval,
    pricingRolesConfig,
    generateId = defaultGenerateId,
  } = params;

  const pmWarranted = shouldAddProjectManager && !isPmRemoved(pmRemoval);

  // pmHoursRemoved is already folded into pmWarranted above, so pass `false`
  // here — passing the raw flag again would double-apply the same condition.
  const distribution = calculateRoleHoursDistribution(baseProjectHours, pmHours, pmWarranted, false);
  const onboardingSpecialistHours = distribution.onboardingSpecialistHours;

  let updatedRoles: T[] = [...roles];

  // --- Onboarding Specialist -------------------------------------------
  const hasOnboardingSpecialist = updatedRoles.some(role => role.role === 'Onboarding Specialist');
  if (!hasOnboardingSpecialist) {
    const defaultRate = getDefaultRateForRole('Onboarding Specialist', pricingRolesConfig);
    const description = getDescriptionForRole('Onboarding Specialist', pricingRolesConfig);
    updatedRoles = [
      ...updatedRoles,
      {
        id: generateId(),
        role: 'Onboarding Specialist',
        description,
        ratePerHour: defaultRate,
        defaultRate,
        totalHours: onboardingSpecialistHours,
        totalCost: defaultRate * onboardingSpecialistHours,
      } as T,
    ];
  } else {
    updatedRoles = updatedRoles.map(role => {
      if (role.role !== 'Onboarding Specialist') return role;
      const defaultRate = getDefaultRateForRole('Onboarding Specialist', pricingRolesConfig);
      const description = getDescriptionForRole('Onboarding Specialist', pricingRolesConfig);
      // Preserve the user's custom rate (don't override it with default).
      const currentRate = role.ratePerHour;
      return {
        ...role,
        description: description || role.description,
        ratePerHour: currentRate,
        defaultRate,
        totalHours: onboardingSpecialistHours,
        totalCost: currentRate * onboardingSpecialistHours,
      };
    });
  }

  // --- Project Manager ---------------------------------------------------
  // Ensure the PM row exists (and carries pmHours) exactly when the OS
  // deduction above was applied. Never delete: if PM isn't warranted, or has
  // been removed, an existing PM row is left as-is.
  if (pmWarranted) {
    const hasPM = updatedRoles.some(role => role.role === 'Project Manager');
    if (!hasPM) {
      const defaultRate = getDefaultRateForRole('Project Manager', pricingRolesConfig);
      const description = getDescriptionForRole('Project Manager', pricingRolesConfig);
      updatedRoles = [
        ...updatedRoles,
        {
          id: generateId(),
          role: 'Project Manager',
          description,
          ratePerHour: defaultRate,
          defaultRate,
          totalHours: pmHours,
          totalCost: defaultRate * pmHours,
        } as T,
      ];
    } else {
      updatedRoles = updatedRoles.map(role => {
        if (role.role !== 'Project Manager') return role;
        const defaultRate = getDefaultRateForRole('Project Manager', pricingRolesConfig);
        const description = getDescriptionForRole('Project Manager', pricingRolesConfig);
        // Preserve the user's custom rate, same as the OS branch above.
        const currentRate = role.ratePerHour;
        return {
          ...role,
          description: description || role.description,
          ratePerHour: currentRate,
          defaultRate,
          totalHours: pmHours,
          totalCost: currentRate * pmHours,
        };
      });
    }
  }

  return updatedRoles;
}
