# Editable Signer After Approval — Design

**Date:** 2026-07-03
**Status:** Approved (pending spec review)

## Problem

Once a SOW is approved it becomes immutable in the editor, with one existing
exception: admins can fix **pricing** via a "pricing-only" edit mode. The
**signer** fields (customer signer(s) and the LeanData signatory) frequently
need correcting after approval — a wrong name, title, email, or the wrong
LeanData signatory — but there is currently no way to change them without a
change order or a manual DB edit.

## Goal

Let signer information be edited on an **approved** SOW, by any user who already
has permission to edit that SOW, without requiring reapproval.

## Requirements & Decisions

- **Who can edit:** the existing edit-permission set — the SOW **author**, or a
  user with an elevated role (**admin / manager / pmo**). No new permission
  concept; this matches the object-level check already enforced in the
  `tab-update` route.
- **Scope:** a **signers-only restricted mode**. On an approved SOW the editor
  shows **only** the Signers & Roles tab; every other field remains locked. This
  mirrors the existing pricing-only mode.
- **No reapproval:** saving a signer change leaves `status = 'approved'`
  unchanged. The change is captured by the existing changelog.
- **Non-goals:** no change to the in-review edit rules; no change to the pricing
  flow's behavior; no new backend persistence (the Signers & Roles save path
  already exists).

## Current Behavior (baseline)

The post-approval lock is enforced almost entirely **client-side** in the edit
page. The backend `tab-update`/`bulk-update` routes only block `in_review`
status — they already accept a `Signers & Roles` update on an approved SOW.

- `src/app/sow/[id]/edit/page.tsx:35` — the gate:
  ```ts
  // Allow admins to edit pricing on approved SOWs
  if ((status === 'approved' || status === 'rejected') && !(isAdmin && pricingOnly)) {
    router.push(`/sow/${params.id}?error=immutable`);
    return;
  }
  ```
  `pricingOnly` is derived from `?tab=pricing` (line 20). Line 117 computes
  `isPricingOnlyMode = pricingOnly && isAdmin && sowStatus === 'approved'` and
  passes it to `SOWForm` as the `pricingOnly` prop.
- `src/components/SOWForm.tsx` — the `pricingOnly` boolean gates: initial active
  tab (`:278`), the visible tab list (`:925`, `:984`), the save-scope
  (`:925`), the mode banner (`:1217`), and the save-button label (`:1494`).
- `src/components/sow/SOWFullView.tsx:986` — the admin-only "Edit Pricing" link
  to `/sow/[id]/edit?tab=pricing`.
- Signer fields live on the `SOWTemplate` interface in `src/types/sow.ts`
  (`customer_signature_name`, `customer_signature` [title], `customer_email`,
  optional second signer `*_2`, and `lean_data_*` + `leandata_signatory_id`).
  They are edited in `src/components/sow/TeamRolesTab.tsx` ("Signers & Roles")
  and persisted through the `Signers & Roles` case in
  `src/lib/sow/tab-column-mapping.ts` (unchanged by this work).

## Approach

Chosen: **generalize the single restricted-mode prop** rather than add a second
parallel boolean.

- Replace the `pricingOnly` prop on `SOWForm` with
  `restrictedTab?: 'Pricing' | 'Signers & Roles'`.
- Internally derive `const pricingOnly = restrictedTab === 'Pricing'` so the
  large number of existing `pricingOnly` references change minimally, and gate
  the tab list / initial tab / save-scope / banner on `restrictedTab`.
- This makes the two modes mutually exclusive by construction (no illegal
  "both true" state) and avoids the drift risk of having to add `|| signersOnly`
  next to every `pricingOnly` check.

Rejected alternative: a parallel `signersOnly` boolean — less to touch now, but
each `pricingOnly` check risks needing a twin, which is exactly the kind of
drift that causes bugs.

## Changes

1. **`src/app/sow/[id]/edit/page.tsx`**
   - Derive the requested restricted tab from the `?tab` query param
     (`pricing` → `'Pricing'`, `signers` → `'Signers & Roles'`).
   - Compute an edit-permission flag for the fetched SOW: author
     (`sow.author_id === session.user.id`) **or** role in
     `{admin, manager, pmo}`. The fetched SOW already carries `author_id`.
   - Widen the immutable-redirect gate so an approved SOW opens when the
     requested restricted tab is `signers` **and** the user passes that
     edit-permission check (pricing keeps its current `isAdmin` gate).
   - Pass `restrictedTab` to `SOWForm` (only when the SOW is `approved`, matching
     the existing `isPricingOnlyMode` guard).

2. **`src/components/SOWForm.tsx`**
   - Swap the `pricingOnly?: boolean` prop for
     `restrictedTab?: 'Pricing' | 'Signers & Roles'`; derive
     `pricingOnly = restrictedTab === 'Pricing'` internally to minimize churn.
   - When `restrictedTab === 'Signers & Roles'`: show only that tab, default the
     active tab to it, scope `handleSaveAll` to `['Signers & Roles']`, and render
     a "Signers-Only Edit Mode" banner mirroring the pricing banner
     (`:1217`), with an appropriate save-button label.

3. **`src/components/sow/SOWFullView.tsx`** (~`:980` Actions block)
   - Add an "Edit Signers" link to `/sow/[id]/edit?tab=signers`, visible to the
     edit-permitted set (author or admin/manager/pmo) — **not** admin-gated like
     the pricing link. SOWFullView already has `session`, `isAdmin`, `isManager`,
     and `sow.author_id`; add `pmo` to the check (as done for
     `canAnchorComment`).

4. **Backend** — no change required. `tab-update`/`bulk-update` already accept a
   `Signers & Roles` edit on an approved SOW (they gate only on `in_review`), and
   `ChangelogService.compareSOWs` already logs the change. *(Optional future
   hardening: have the server independently enforce "approved ⇒ only
   Signers/Pricing tabs." Out of scope here.)*

## Testing (manual)

1. As the **SOW author**: open an approved SOW → "Edit Signers" → change the
   primary signer, the second signer, and the LeanData signatory → save →
   confirm values persist, `status` is still `approved`, and a changelog entry
   is recorded.
2. As a **non-owner manager/pmo**: same flow succeeds.
3. As a **non-owner plain user** (no elevated role): the "Edit Signers" link is
   not shown, and navigating directly to `/sow/[id]/edit?tab=signers` redirects
   with `?error=immutable`.
4. **Regression:** the admin pricing flow (`?tab=pricing`) still works and still
   shows only the Pricing tab; a normal draft/in-review edit still shows all
   tabs.
