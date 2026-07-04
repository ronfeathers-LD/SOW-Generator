# SOW Hours: Single Source of Truth — Design

**Date:** 2026-06-29
**Status:** Draft (awaiting review)
**Author:** Ron Feathers (with Claude)

## Problem

"How many hours does each role get, and is the Project Manager included?" is
currently represented in **three places that must be kept in sync by hand**:

1. **The live formula** — `calculateAllHours(products)` →
   `calculateRoleHoursDistribution(base, pmHours, shouldAddPM, pmRemoved)`,
   recomputed on every render from products/units.
2. **The persisted `pricing_roles` JSON** — the editable Role Costs table; this
   is what the PDF/quote actually renders.
3. **The `pm_hours_requirement_disabled` flag** (+ `pm_hours_removed`,
   `pm_hours_removal_approved`, dates, requester/approver).

Every surface that touches hours — pricing tab, billing auto-calc, PDF
generator, print view, full view, approval rules, the standalone pricing
calculator — independently re-derives or re-reconciles these. When a write
updates one representation but not the others, they **drift**.

### The bug that triggered this (2026-06-29)

David removed PM hours on an Enterprise SOW. The removal deleted the PM row from
the table but did not set the authorization flag (old code) — and even the
follow-up fix only set the flag on *new* removals through one specific handler.
Result: the "Project Summary" breakdown (which recomputes from products and
reads the flag) kept showing `Project Manager (45%): 16h` and
`Onboarding Specialist Deduction: −8h`, while the Role Costs table showed only
Onboarding Specialist at 27h. The stranded `−8h` deduction is the user-visible
symptom ("it doesn't remove the deduction"), and the quote total was wrong
($6,750 / 27h instead of $8,750 / 35h).

This is not a one-off: it is the predictable consequence of storing derived
state in multiple places. Any future surface that forgets to reconcile all
three will reintroduce drift.

## Goals

- **One authoritative computation** of role hours; eliminate flag-vs-table-vs-
  formula drift by construction.
- Preserve **fully free-form editing** of the Role Costs table (users routinely
  hand-edit hours and rates, and add/remove roles).
- Preserve the **authorization semantics** of PM removal (Enterprise = direct
  with sign-off record; non-Enterprise = PMO approval required). Nobody can
  silently drop PM hours.
- Keep the existing **pricing rules** unchanged.

## Non-Goals (YAGNI)

- Changing the business rules: the 45% PM allocation, the half-PM Onboarding
  Specialist deduction, segment gating (EE/LE vs others), or approval routing.
- Re-architecting the standalone pricing calculator's separate model beyond
  pointing it at the shared read model if cheap.
- Anything about the Vercel→Railway deployment / cutover.

## Design (Approach A: the table is the source of truth)

**Core principle:** the stored `pricing_roles` table is the single source of
truth for everything that appears on the SOW/quote. Hours are **read** from it,
never recomputed live for display. The products→hours formula is a one-shot
action that **writes** the table.

### 1. One read model

New module `src/lib/sow/pricing-summary.ts` exporting a pure function:

```
getPricingSummary(pricing_roles): {
  roles: Array<{ role, hours, rate, cost }>,
  subtotal, discountTotal, total,
  pmIncluded: boolean,   // a "Project Manager" row with hours > 0 exists
  totalHours
}
```

Every surface that displays hours/costs/totals/PM-state reads through this
function. No display surface recomputes from products. The function is the
single definition of "what does this SOW's pricing say."

### 2. Demote the live formula to an explicit "Recalculate"

`calculateAllHours` and `calculateRoleHoursDistribution` are invoked **only** by
an explicit user action: **"Recalculate hours from products."** This action
overwrites the table from the current products/units, guarded by a confirm when
the user has hand-edited. Reuse the existing `pricing_roles.auto_calculated`
field as the signal (set false on any manual row edit) rather than adding a new
marker.

Removed:
- The `roleDistribution` `useMemo` in `PricingRolesAndDiscount` that drives the
  live breakdown.
- The auto-calc effect in `BillingPaymentTab` that re-adds the PM role whenever
  `shouldAddPM && !pm_hours_requirement_disabled`.

### 3. The "Project Summary" breakdown is derived from the table

The breakdown panel sums the table rows (via `getPricingSummary`) instead of
recomputing Base/PM/deduction from products — so it can never disagree with the
table again.

The products-derivation explanation (Base 35 → PM 45% = 16 → −8 OS deduction) is
shown **only transiently** as part of the Recalculate action ("here's what we
calculated from your products"), not as a persistent panel alongside the
authoritative table. **This is a deliberate UX change** — the persistent panel
is exactly what David saw disagree with the table.

### 4. Split the flag's two jobs

`pm_hours_requirement_disabled` currently conflates two responsibilities. We
separate them:

- **Math** ("is PM included?") → **derived from the table** via
  `getPricingSummary().pmIncluded`. No surface reads the flag for math.
- **Authorization** ("this removal was signed off") → remains in
  `pm_hours_requirement_disabled` (+ approval fields). Approval rules
  (`approval-workflow-rules`, `approval-workflow-service`) read it unchanged.

Guard: the UI cannot delete the PM row except through the proper removal flow,
which both deletes the row and records authorization. Removing PM hours and
recording "this was allowed" become a single atomic operation.

### 5. Add/remove PM = table mutations through one server path

Both the Enterprise (direct) and non-Enterprise (post-approval) removals call
the **same** server routine: delete the PM row + redistribute its hours to the
Onboarding Specialist (`stripProjectManagerFromPricing`) + set authorization
fields — atomically. Re-add is the inverse (`restoreProjectManagerToPricing`).
The front-end never hand-rolls the strip/restore (today's
`handleEnterprisePMRemovalConfirm` doing `setPricingRoles(filter)` locally is the
root of the bug).

### 6. Migration / backfill

Existing SOWs are in mixed states (David's was one: PM removed, flag false, OS
deduction stranded). A one-time backfill reconciles each SOW so the **table is
correct** and the **authorization flag matches reality**:

- If a SOW has no PM row but `shouldAddPM` would be true and the OS row still
  carries the half-PM deduction → restore OS to full base hours and set the
  authorization flag (this is the "stranded deduction" class).
- If a SOW's flag and table already agree → leave it.

The backfill runs as a dry-run producing a per-SOW before/after report for
review **before** any write. (David's SOW `ad9cfae2` was already hand-repaired
on 2026-06-29 as the reference case: OS 27→35h, $6,750→$8,750, flag set.)

## Consumers to update

From `grep` of `calculateRoleHoursDistribution`, `calculateAllHours`, and
`pm_hours_requirement_disabled`:

| Surface | Change |
|---|---|
| `PricingRolesAndDiscount.tsx` | drop live `roleDistribution` memo; summary reads `getPricingSummary`; Recalculate is explicit |
| `BillingPaymentTab.tsx` | remove auto-calc re-add effect; mismatch check reads table |
| `PricingCalculatorResults.tsx` | breakdown reads the shared read model |
| `SOWPrintView.tsx`, `SOWFullView.tsx` | PM-included derived from table, not flag |
| `pdf-generator.ts`, `api/sow/[id]/pdf/route.ts` | PM-included derived from table |
| `approval-workflow-rules.ts`, `approval-workflow-service.ts` | unchanged — keep reading flag as authorization |
| `pm-hours-removal-service.ts` | becomes the single strip/restore + authorization path |

## Testing

- **Unit:** `getPricingSummary` (totals, `pmIncluded`); `stripProjectManagerFromPricing` /
  `restoreProjectManagerToPricing` (already partially covered).
- **Invariant:** for any `pricing_roles`, `summary.total == sum(row.cost)` and
  `summary.pmIncluded == (a PM row with hours > 0 exists)`.
- **Regression:** reproduce David's bug — remove PM on an EE SOW, save, reload;
  assert no stranded deduction, OS at full base hours, totals correct, and
  `pmIncluded == false`.
- **Backfill:** dry-run snapshot test on a fixture of mixed-state SOWs.

## Risks / open questions

- **Breadth of consumer edits.** PM-included is read in ~8 files; each must move
  from "read flag / recompute" to "ask the read model." Mitigation: land the
  read model first with tests, then migrate consumers one at a time.
- **"Recalculate overwrites edits" UX.** Needs a clear confirm keyed off
  `auto_calculated` so we don't silently clobber hand-entered hours.
- **Standalone pricing calculator** has its own data path; folding it into the
  read model is desirable but may be deferred.
- **Backfill detection** of the "stranded deduction" class depends on
  recomputing `shouldAddPM`/base per SOW from products; needs care for SOWs with
  incomplete product data.

## Rollout

1. Land `getPricingSummary` + tests (no behavior change).
2. Make removal/re-add go through the single server path; derive PM-included
   from the table in the editor surfaces.
3. Migrate display/PDF/print/approval surfaces to the read model.
4. Remove the live memo + auto-calc effect; make Recalculate explicit.
5. Backfill existing SOWs (dry-run → review → apply).
