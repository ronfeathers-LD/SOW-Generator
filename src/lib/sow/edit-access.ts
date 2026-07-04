// Post-approval editing is locked for most fields. Two exceptions open a
// single-tab "restricted" editor: admins fixing Pricing, and edit-permitted
// users fixing Signers. This module is the single source of truth for that gate
// so the edit page and any future caller stay in sync. Pure + unit-tested; the
// backend (tab-update) independently enforces object-level auth.

export type RestrictedTab = 'Pricing' | 'Signers & Roles';

const ELEVATED_ROLES = ['admin', 'manager', 'pmo'];

/** Map the `?tab=` query param to the restricted tab it requests, if any. */
export function resolveRestrictedTab(
  tabParam: string | null | undefined,
): RestrictedTab | null {
  if (tabParam === 'pricing') return 'Pricing';
  if (tabParam === 'signers') return 'Signers & Roles';
  return null;
}

/** Who may edit signers: the SOW author, or an elevated role. */
export function canEditSigners(params: {
  role?: string | null;
  isAuthor: boolean;
}): boolean {
  return params.isAuthor || ELEVATED_ROLES.includes(params.role ?? '');
}

/**
 * Decide whether the editor may open for a given SOW, and in which restricted
 * mode. `formRestrictedTab` is non-null only when the form should be locked to a
 * single tab — i.e. an approved SOW opened via a valid restricted-mode request.
 */
export function resolveEditAccess(input: {
  status: string;
  requestedTab: RestrictedTab | null;
  role?: string | null;
  isAuthor: boolean;
}): { allowed: boolean; formRestrictedTab: RestrictedTab | null } {
  const { status, requestedTab, role, isAuthor } = input;

  // Non-locked statuses (draft / in_review / recalled) open the full editor.
  const locked = status === 'approved' || status === 'rejected';
  if (!locked) return { allowed: true, formRestrictedTab: null };

  const pricingOk = requestedTab === 'Pricing' && role === 'admin';
  const signersOk =
    requestedTab === 'Signers & Roles' && canEditSigners({ role, isAuthor });

  if (!pricingOk && !signersOk) {
    return { allowed: false, formRestrictedTab: null };
  }

  // The single-tab restriction only applies to approved SOWs. A rejected SOW is
  // allowed through (preserving current behavior) but opens the full form.
  const formRestrictedTab =
    status === 'approved' ? (pricingOk ? 'Pricing' : 'Signers & Roles') : null;

  return { allowed: true, formRestrictedTab };
}
