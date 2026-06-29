/**
 * Client-side pricing-table edits that must stay in sync with the server.
 */

/** Minimal shape of an editable pricing role row needed for PM removal. */
interface EditablePricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  totalHours: number;
  totalCost: number;
}

/**
 * Remove the Project Manager row (identified by `pmRoleId`) and restore the
 * half-PM deduction back to the Onboarding Specialist row.
 *
 * This is the CLIENT-SIDE MIRROR of the server's `stripProjectManagerFromPricing`
 * (src/lib/pm-hours-removal-service.ts). The server, when stripping the PM role,
 * redistributes `OS.totalHours += removedPMHours / 2` (reversing the half-PM
 * deduction that was applied when the PM role was added). The local pricing table
 * MUST apply the exact same redistribution after a successful enterprise-disable,
 * otherwise the editor shows the OS at reduced hours and a subsequent Save All
 * re-strands the deduction in the DB.
 *
 * KEEP IN SYNC with stripProjectManagerFromPricing: OS += pmHours / 2, where
 * pmHours is the removed PM row's totalHours.
 *
 * Edge cases mirror the server:
 *  - No PM row matching `pmRoleId`: nothing removed, roles returned unchanged.
 *  - No Onboarding Specialist row: PM removed, no redistribution.
 */
export function removePmRoleRestoringOs<T extends EditablePricingRole>(
  roles: T[],
  pmRoleId: string
): T[] {
  const pmRole = roles.find(role => role.id === pmRoleId);

  // No PM row to remove — behave as a no-op (mirrors the server's "nothing to do").
  if (!pmRole) {
    return [...roles];
  }

  const pmHours = pmRole.totalHours;

  return roles
    .filter(role => role.id !== pmRoleId)
    .map(role => {
      if (role.role === 'Onboarding Specialist') {
        const newTotalHours = role.totalHours + pmHours / 2;
        return {
          ...role,
          totalHours: newTotalHours,
          totalCost: newTotalHours * role.ratePerHour,
        };
      }
      return role;
    });
}
