import type { ClientRole } from '@/types/sow';

/**
 * The five standard client-role slots seeded onto every new SOW's
 * client_roles list. `name`/`email` are left blank for the customer to fill
 * in; `responsibilities` carries concise canned guidance (adapted from the
 * quick-fill strings in TeamRolesTab.tsx where a matching role exists).
 */
export const STANDARD_CLIENT_ROLES: ClientRole[] = [
  {
    role: 'Executive Sponsor',
    name: '',
    email: '',
    responsibilities: 'The Executive Sponsor is the client sponsor for the project and acts as the strategic point of contact for the project.',
  },
  {
    role: 'Project Manager',
    name: '',
    email: '',
    responsibilities: 'The Project Manager coordinates the client-side schedule and resources, and is the main point of contact for day-to-day project logistics.',
  },
  {
    role: 'LeanData Administrator',
    name: '',
    email: '',
    responsibilities: 'The LeanData admin will be responsible for the control and administration of the LD system, helping build/test during implementation and serving ongoing configuration needs.',
  },
  {
    role: 'Owner of Business Requirements',
    name: '',
    email: '',
    responsibilities: 'The Owner of Business Requirements defines and validates the use cases and business requirements the project must satisfy.',
  },
  {
    role: 'SFDC System Team Point of Contact',
    name: '',
    email: '',
    responsibilities: 'The person with System Admin level permissions in SFDC who will assist in downloading LD, granting permissions, creating custom fields, and any other SFDC-related tasks.',
  },
];

/**
 * Returns `existing` plus whichever of the five standard role slots are
 * missing (matched case-insensitively on trimmed `role`). Existing entries
 * are never modified, removed, or reordered — standard slots are appended
 * after them. Returns the SAME array reference when all five are already
 * present, so callers can use reference equality as a no-op signal.
 */
export function mergeStandardClientRoles(existing: ClientRole[]): ClientRole[] {
  const existingRoleNames = new Set(existing.map(r => r.role.trim().toLowerCase()));

  const missing = STANDARD_CLIENT_ROLES.filter(
    standard => !existingRoleNames.has(standard.role.trim().toLowerCase())
  );

  if (missing.length === 0) {
    return existing;
  }

  return [...existing, ...missing];
}
