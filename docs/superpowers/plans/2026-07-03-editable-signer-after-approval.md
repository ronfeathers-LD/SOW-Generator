# Editable Signer After Approval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a SOW's signer information be edited on an approved SOW by any user who can already edit that SOW, without reapproval, via a signers-only restricted editor mode.

**Architecture:** Extract the post-approval edit-gate + mode-resolution logic into one pure, unit-tested helper (`src/lib/sow/edit-access.ts`), matching the repo's convention of testing pure logic in `src/lib`. The edit page consumes it to decide whether to open the editor and in which restricted mode. `SOWForm`'s existing `pricingOnly` boolean is generalized to a single `restrictedTab` prop so the two restricted modes (Pricing, Signers) are mutually exclusive by construction. An "Edit Signers" link in `SOWFullView` is the entry point.

**Tech Stack:** Next.js 15 App Router, TypeScript, React, Vitest, NextAuth (session role), Tailwind.

## Global Constraints

- Signer edit permission = **SOW author OR role in {admin, manager, pmo}**. This matches the object-level check in `src/app/api/sow/[id]/tab-update/route.ts:53-60`. Copy this rule exactly; do not invent a new permission concept.
- Editing a signer on an approved SOW MUST leave `status = 'approved'` unchanged (no reapproval). No status write is added anywhere in this plan.
- Do NOT change existing pricing-mode behavior, in-review edit rules, or rejected-SOW behavior. The helper must reproduce current pricing/rejected semantics exactly and only ADD the signers path.
- No backend/API changes. `tab-update`/`bulk-update` already accept a `Signers & Roles` edit on an approved SOW (they gate only on `in_review`), and `ChangelogService.compareSOWs` already logs the change.
- The restricted tab values are the exact `SowTabKey` strings: `'Pricing'` and `'Signers & Roles'`.
- Run `npm run test` (vitest), `npm run lint`, and `npm run build:verify` as the verification gates (there is no React component test harness — no @testing-library).

## File Structure

- Create: `src/lib/sow/edit-access.ts` — pure helper: map `?tab` param → restricted tab; signer-edit permission; open/mode decision.
- Create: `src/lib/sow/edit-access.test.ts` — vitest unit tests for the helper.
- Modify: `src/app/sow/[id]/edit/page.tsx` — replace inline gate with the helper; compute `isAuthor`; pass `restrictedTab` to `SOWForm`.
- Modify: `src/components/SOWForm.tsx` — replace `pricingOnly` prop with `restrictedTab`; add signers-only rendering (tab list, initial tab, save scope, banner, button label, nav/back/next hiding).
- Modify: `src/components/sow/SOWFullView.tsx` — add "Edit Signers" link visible to the edit-permitted set.

---

### Task 1: Pure edit-access helper

**Files:**
- Create: `src/lib/sow/edit-access.ts`
- Test: `src/lib/sow/edit-access.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `type RestrictedTab = 'Pricing' | 'Signers & Roles'`
  - `resolveRestrictedTab(tabParam: string | null | undefined): RestrictedTab | null`
  - `canEditSigners(params: { role?: string | null; isAuthor: boolean }): boolean`
  - `resolveEditAccess(input: { status: string; requestedTab: RestrictedTab | null; role?: string | null; isAuthor: boolean }): { allowed: boolean; formRestrictedTab: RestrictedTab | null }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sow/edit-access.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  resolveRestrictedTab,
  canEditSigners,
  resolveEditAccess,
} from './edit-access';

describe('resolveRestrictedTab', () => {
  it('maps the pricing param', () => {
    expect(resolveRestrictedTab('pricing')).toBe('Pricing');
  });
  it('maps the signers param', () => {
    expect(resolveRestrictedTab('signers')).toBe('Signers & Roles');
  });
  it('returns null for anything else', () => {
    expect(resolveRestrictedTab(undefined)).toBeNull();
    expect(resolveRestrictedTab(null)).toBeNull();
    expect(resolveRestrictedTab('objectives')).toBeNull();
  });
});

describe('canEditSigners', () => {
  it('allows the author regardless of role', () => {
    expect(canEditSigners({ role: 'user', isAuthor: true })).toBe(true);
  });
  it('allows elevated roles', () => {
    expect(canEditSigners({ role: 'admin', isAuthor: false })).toBe(true);
    expect(canEditSigners({ role: 'manager', isAuthor: false })).toBe(true);
    expect(canEditSigners({ role: 'pmo', isAuthor: false })).toBe(true);
  });
  it('denies a non-author plain user', () => {
    expect(canEditSigners({ role: 'user', isAuthor: false })).toBe(false);
    expect(canEditSigners({ role: null, isAuthor: false })).toBe(false);
  });
});

describe('resolveEditAccess', () => {
  it('opens normally (full form) for non-locked statuses', () => {
    expect(
      resolveEditAccess({ status: 'draft', requestedTab: null, role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
    expect(
      resolveEditAccess({ status: 'in_review', requestedTab: null, role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });

  // Pricing behavior must be preserved exactly.
  it('lets an admin into pricing-only mode on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Pricing', role: 'admin', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Pricing' });
  });
  it('blocks a non-admin from pricing on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Pricing', role: 'manager', isAuthor: true }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });
  it('blocks an approved SOW opened with no restricted tab', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: null, role: 'admin', isAuthor: true }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });

  // New signers behavior.
  it('lets the author into signers-only mode on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Signers & Roles' });
  });
  it('lets an elevated non-author into signers-only mode', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'pmo', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Signers & Roles' });
  });
  it('blocks a non-author plain user from signers on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'user', isAuthor: false }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });

  // Rejected: preserve current semantics — admin+pricing gets in but form is NOT restricted
  // (formRestrictedTab is null unless status is exactly 'approved').
  it('admin+pricing on a rejected SOW is allowed but not restricted', () => {
    expect(
      resolveEditAccess({ status: 'rejected', requestedTab: 'Pricing', role: 'admin', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });
  it('signers on a rejected SOW is allowed but not restricted', () => {
    expect(
      resolveEditAccess({ status: 'rejected', requestedTab: 'Signers & Roles', role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/sow/edit-access.test.ts`
Expected: FAIL — cannot resolve module `./edit-access`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/sow/edit-access.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/sow/edit-access.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sow/edit-access.ts src/lib/sow/edit-access.test.ts
git commit -m "feat(sow): add pure edit-access helper for restricted post-approval edits"
```

---

### Task 2: Generalize SOWForm to `restrictedTab` and wire the edit page

**Files:**
- Modify: `src/components/SOWForm.tsx` (prop + internal usages of `pricingOnly`)
- Modify: `src/app/sow/[id]/edit/page.tsx` (the sole caller passing the mode prop)

**Interfaces:**
- Consumes: `resolveRestrictedTab`, `resolveEditAccess`, `RestrictedTab` from Task 1.
- Produces: `SOWForm` now takes `restrictedTab?: RestrictedTab` instead of `pricingOnly?: boolean`.

**Why these two files together:** the edit page is the only caller that passes the mode prop (verified via grep). Renaming the prop and updating its sole call site must land together to keep the build green.

- [ ] **Step 1: Update the SOWForm prop signature**

In `src/components/SOWForm.tsx`, add the import near the other `@/lib/sow` imports:

```ts
import type { RestrictedTab } from '@/lib/sow/edit-access';
```

Replace the prop declaration (currently `pricingOnly?: boolean;` at ~line 81):

```ts
  restrictedTab?: RestrictedTab;
```

Replace the component signature (currently `export default function SOWForm({ initialData, pricingOnly = false, status }: SOWFormProps) {` at ~line 86):

```ts
export default function SOWForm({ initialData, restrictedTab, status }: SOWFormProps) {
```

Immediately after the signature's opening line, derive the two flags the body uses (place with the other early `const`s, before `activeTab` state at ~line 278):

```ts
  // Two mutually exclusive single-tab modes. `pricingOnly` is kept as a derived
  // local so the many existing pricing checks below read unchanged.
  const pricingOnly = restrictedTab === 'Pricing';
  const signersOnly = restrictedTab === 'Signers & Roles';
```

- [ ] **Step 2: Point the initial active tab at the restricted tab**

Replace the `activeTab` initializer (currently at ~line 278):

```ts
  const [activeTab, setActiveTab] = useState(restrictedTab ?? 'Customer Information');
```

- [ ] **Step 3: Restrict the visible tab list and the wizard keys**

In the `tabs` useMemo (~line 983-989), replace the pricing-only filter block:

```ts
    // Restricted modes show only their single tab.
    if (restrictedTab) {
      return allTabs.filter(tab => tab.key === restrictedTab);
    }

    return allTabs;
  }, [restrictedTab]);
```

In the `wizardKeys` useMemo (~line 993-1001), replace `pricingOnly` with `restrictedTab` so any restricted mode is a single Back/Next stop:

```ts
  const wizardKeys = useMemo(
    () =>
      restrictedTab
        ? tabs.map((t) => t.key)
        : PHASES.flatMap((p) => (p.key === 'commercials' ? [p.sections[0]] : p.sections)),
    [tabs, restrictedTab],
  );
```

- [ ] **Step 4: Scope the save to the restricted tab**

In `handleSaveAll` (~line 925), replace the `tabKeys` initializer:

```ts
    let tabKeys: SowTabKey[] = restrictedTab ? [restrictedTab] : [...SOW_TAB_KEYS];
```

(The subsequent `if (!livePricing) tabKeys = tabKeys.filter(tab => tab !== 'Pricing')` line stays as-is: for signers-only it is a no-op, and the Signers & Roles tab writes straight to `formData`, so `pricingData: null` is fine.)

- [ ] **Step 5: Add the signers-only banner and generalize the mode chrome**

Replace the pricing-only banner block (~line 1217-1232) so a signers banner shows too. Replace the opening `{pricingOnly && (` ... through its closing `)}` with:

```tsx
      {/* Restricted-mode notice */}
      {restrictedTab && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {pricingOnly ? (
                  <><strong>Pricing-Only Edit Mode:</strong> You are editing pricing and discounts on an approved SOW. Only pricing-related fields can be modified.</>
                ) : (
                  <><strong>Signers-Only Edit Mode:</strong> You are editing the signers on an approved SOW. Only signer fields can be modified; no re-approval is required.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
```

Replace the phases-nav wrapper condition (currently `{!pricingOnly && (` at ~line 1235) so the wizard nav is hidden in BOTH restricted modes:

```tsx
      {!restrictedTab && (
```

Replace the commercials-section condition (currently `{!pricingOnly && activePhase.key === 'commercials' && (` at ~line 1366):

```tsx
      {!restrictedTab && activePhase.key === 'commercials' && (
```

- [ ] **Step 6: Generalize the footer buttons**

In the footer (~line 1462), replace the Back-button condition `{!pricingOnly ? (` with:

```tsx
            {!restrictedTab ? (
```

Replace the Save button label (~line 1494):

```tsx
                {restrictedTab ? (pricingOnly ? 'Save Pricing' : 'Save Signers') : 'Save all changes'}
```

Replace the Next-button condition (~line 1496) `{!pricingOnly && showNextButton && (`:

```tsx
              {!restrictedTab && showNextButton && (
```

- [ ] **Step 7: Wire the edit page to the helper**

In `src/app/sow/[id]/edit/page.tsx`, add the import:

```ts
import { resolveRestrictedTab, resolveEditAccess } from '@/lib/sow/edit-access';
```

Replace the `pricingOnly` derivation (currently line 20) with a requested-tab derivation:

```ts
  const requestedTab = resolveRestrictedTab(searchParams?.get('tab'));
```

Add a piece of state next to `sowStatus` (~line 17) to carry the mode into render:

```ts
  const [formRestrictedTab, setFormRestrictedTab] = useState<
    'Pricing' | 'Signers & Roles' | null
  >(null);
```

Inside `fetchSOW`, replace the gate block (currently lines 34-39) with:

```ts
          const status = data.status;
          setSOWStatus(status);

          const isAuthor = !!data.author_id && data.author_id === session?.user?.id;
          const access = resolveEditAccess({
            status,
            requestedTab,
            role: session?.user?.role,
            isAuthor,
          });

          if (!access.allowed) {
            router.push(`/sow/${params.id}?error=immutable`);
            return;
          }
          setFormRestrictedTab(access.formRestrictedTab);
```

Update the effect dependency array (currently `[params.id, router, isAdmin, pricingOnly]` at ~line 59) to:

```ts
  }, [params.id, router, requestedTab, session?.user?.id, session?.user?.role]);
```

Remove the now-unused `isAdmin`/`pricingOnly`/`isPricingOnlyMode` locals (lines 19-20 and ~116-117). Replace the final render (line 119):

```tsx
  return (
    <SOWForm
      initialData={sow}
      restrictedTab={formRestrictedTab ?? undefined}
      status={sowStatus ?? undefined}
    />
  );
```

- [ ] **Step 8: Verify types, lint, tests, build**

Run: `npm run test`
Expected: PASS (Task 1 tests still green).

Run: `npm run lint`
Expected: no errors in `SOWForm.tsx` or `edit/page.tsx` (no unused-var warnings for the removed `isAdmin`/`pricingOnly`).

Run: `npm run build:verify`
Expected: build succeeds — confirms the prop rename compiles with its sole caller.

- [ ] **Step 9: Commit**

```bash
git add src/components/SOWForm.tsx src/app/sow/[id]/edit/page.tsx
git commit -m "feat(sow): signers-only edit mode via generalized restrictedTab prop"
```

---

### Task 3: "Edit Signers" entry point in SOWFullView

**Files:**
- Modify: `src/components/sow/SOWFullView.tsx` (Actions block, ~line 980-1001)

**Interfaces:**
- Consumes: `SOWForm`/edit route from Task 2 (via `/sow/[id]/edit?tab=signers`). No new exports.

- [ ] **Step 1: Compute a signer-edit permission flag**

In `src/components/sow/SOWFullView.tsx`, near the existing role flags (~line 104-106, where `isAdmin`/`isManager` are defined), add:

```ts
  const isPmo = session?.user?.role === 'pmo';
  const isSowAuthor = !!sow.author_id && sow.author_id === session?.user?.id;
  const canEditSigners = isSowAuthor || isAdmin || isManager || isPmo;
```

- [ ] **Step 2: Add the "Edit Signers" link to the approved-SOW Actions block**

In the Actions block, immediately after the admin "Edit Pricing" `{isAdmin && ( ... )}` group (closes at ~line 1001) and before the "Create Change Order" block, insert:

```tsx
                          {/* Edit Signers (author + elevated roles) */}
                          {canEditSigners && (
                            <div className="mb-4">
                              <Link
                                href={`/sow/${sow.id}/edit?tab=signers`}
                                className="w-full inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Signers
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">
                                Correct the signers on an approved SOW without re-approval.
                              </p>
                            </div>
                          )}
```

- [ ] **Step 3: Verify lint and build**

Run: `npm run lint`
Expected: no errors in `SOWFullView.tsx` (`Link` is already imported — it is used by the Edit Pricing link).

Run: `npm run build:verify`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/sow/SOWFullView.tsx
git commit -m "feat(sow): add Edit Signers entry point on approved SOWs"
```

---

### Task 4: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Author path**

Run `npm run dev`. As the SOW's author, open an **approved** SOW's view page → click **Edit Signers**. Confirm: the editor opens showing ONLY the Signers & POCs tab, with the "Signers-Only Edit Mode" banner and no phase nav / Back / Next. Change the primary signer, the second signer, and the LeanData signatory → **Save Signers**.

- [ ] **Step 2: Confirm persistence, status, and audit**

Reload the view page. Confirm the new signer values are shown, the SOW `status` is still **approved**, and a new **changelog** entry records the signer change (Changelog tab).

- [ ] **Step 3: Elevated non-owner path**

As a manager or pmo who is NOT the author, repeat Step 1 on the same SOW. Confirm the Edit Signers link is present and the save succeeds.

- [ ] **Step 4: Denied path**

As a plain `user` who is NOT the author, open the approved SOW's view page. Confirm the **Edit Signers link is absent**, and navigating directly to `/sow/<id>/edit?tab=signers` redirects to the view page with `?error=immutable`.

- [ ] **Step 5: Pricing regression**

As an admin, confirm **Edit Pricing** (`?tab=pricing`) still opens pricing-only mode showing just the Pricing tab, and that a normal draft/in-review SOW still opens the full multi-tab editor.
