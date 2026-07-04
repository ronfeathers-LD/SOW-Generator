# SOW Hours: Single Source of Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the stored `pricing_roles` table the single source of truth for SOW role hours and PM-inclusion, eliminating drift between the live formula, the table, and the `pm_hours_requirement_disabled` flag.

**Architecture:** Introduce one pure read model (`getPricingSummary`) that every surface uses to read hours/costs/totals/PM-state from `pricing_roles`. Demote the products→hours formula to an explicit "Recalculate" write action. Keep `pm_hours_requirement_disabled` only as an authorization record (read by approval rules), with PM-inclusion derived from the table everywhere else.

**Tech Stack:** Next.js 15 / TypeScript, React, Supabase (service-role server client), Vitest (node env).

## Global Constraints

- Pricing money math must match the canonical server recompute in
  `src/lib/sow/tab-column-mapping.ts:218-234`: `subtotal = Σ(ratePerHour × totalHours)`;
  fixed discount = `min(subtotal, amount)`; percentage discount = `subtotal × pct/100`;
  `total = max(0, subtotal − discountTotal)`.
- `pricing_roles` has two shapes that must both be handled: a bare array (legacy)
  and `{ roles: [...], subtotal, discount_*, total_amount, auto_calculated, last_calculated }`.
- Tests use Vitest, node env, files as `src/**/*.test.ts`. Run with
  `./node_modules/.bin/vitest run <path>`. Placeholder Supabase env is already in
  `vitest.config.ts`.
- Business rules are UNCHANGED: 45% PM allocation, OS loses `pmHours/2` when PM present,
  segment gating (EE/LE = direct removal; others = PMO approval).
- Do not commit to `main`/`production`. Work on a feature branch.
- Prod data writes (backfill) are dry-run → review → apply only.

---

### Task 1: `getPricingSummary` read model

**Files:**
- Create: `src/lib/sow/pricing-summary.ts`
- Test: `src/lib/sow/pricing-summary.test.ts`

**Interfaces:**
- Produces:
  - `type PricingSummaryRole = { role: string; hours: number; rate: number; cost: number }`
  - `type PricingSummary = { roles: PricingSummaryRole[]; subtotal: number; discountTotal: number; total: number; totalHours: number; pmIncluded: boolean }`
  - `function getPricingSummary(pricingRoles: unknown): PricingSummary`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getPricingSummary } from './pricing-summary';

describe('getPricingSummary', () => {
  const obj = {
    roles: [
      { role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 },
      { role: 'Project Manager', totalHours: 16, ratePerHour: 250 },
    ],
    discount_type: 'none',
  };

  it('sums rows into subtotal/total and reports pmIncluded', () => {
    const s = getPricingSummary(obj);
    expect(s.subtotal).toBe((27 + 16) * 250);
    expect(s.total).toBe((27 + 16) * 250);
    expect(s.totalHours).toBe(43);
    expect(s.pmIncluded).toBe(true);
  });

  it('pmIncluded is false when no PM row (or PM hours 0)', () => {
    const s = getPricingSummary({ roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' });
    expect(s.pmIncluded).toBe(false);
    expect(s.total).toBe(35 * 250);
  });

  it('applies fixed and percentage discounts like the server', () => {
    const fixed = getPricingSummary({ roles: [{ role: 'X', totalHours: 10, ratePerHour: 100 }], discount_type: 'fixed', discount_amount: 300 });
    expect(fixed.discountTotal).toBe(300);
    expect(fixed.total).toBe(700);
    const pct = getPricingSummary({ roles: [{ role: 'X', totalHours: 10, ratePerHour: 100 }], discount_type: 'percentage', discount_percentage: 10 });
    expect(pct.discountTotal).toBe(100);
    expect(pct.total).toBe(900);
  });

  it('handles the legacy bare-array shape', () => {
    const s = getPricingSummary([{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }]);
    expect(s.pmIncluded).toBe(false);
    expect(s.total).toBe(8750);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run src/lib/sow/pricing-summary.test.ts`
Expected: FAIL — cannot find module `./pricing-summary`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sow/pricing-summary.ts
export type PricingSummaryRole = { role: string; hours: number; rate: number; cost: number };
export type PricingSummary = {
  roles: PricingSummaryRole[];
  subtotal: number;
  discountTotal: number;
  total: number;
  totalHours: number;
  pmIncluded: boolean;
};

const toNum = (v: unknown): number =>
  typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0;

export function getPricingSummary(pricingRoles: unknown): PricingSummary {
  const isObjectForm =
    !!pricingRoles && typeof pricingRoles === 'object' && !Array.isArray(pricingRoles);
  const container = isObjectForm ? (pricingRoles as Record<string, unknown>) : null;
  const rawRoles = Array.isArray(pricingRoles)
    ? (pricingRoles as Record<string, unknown>[])
    : Array.isArray(container?.roles)
      ? (container!.roles as Record<string, unknown>[])
      : [];

  const roles: PricingSummaryRole[] = rawRoles.map((r) => {
    const hours = toNum(r.totalHours);
    const rate = toNum(r.ratePerHour);
    return { role: String(r.role ?? ''), hours, rate, cost: hours * rate };
  });

  const subtotal = roles.reduce((sum, r) => sum + r.cost, 0);
  const totalHours = roles.reduce((sum, r) => sum + r.hours, 0);

  const discountType = (container?.discount_type as string) || 'none';
  let discountTotal = 0;
  if (discountType === 'fixed') {
    discountTotal = Math.min(subtotal, toNum(container?.discount_amount));
  } else if (discountType === 'percentage') {
    discountTotal = subtotal * (toNum(container?.discount_percentage) / 100);
  }
  const total = Math.max(0, subtotal - discountTotal);

  const pmIncluded = roles.some((r) => r.role === 'Project Manager' && r.hours > 0);

  return { roles, subtotal, discountTotal, total, totalHours, pmIncluded };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run src/lib/sow/pricing-summary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sow/pricing-summary.ts src/lib/sow/pricing-summary.test.ts
git commit -m "feat(pricing): add getPricingSummary read model"
```

---

### Task 2: Single server strip/restore + authorization path

Consolidate the Enterprise direct removal and the post-approval removal so both call one routine that mutates the table AND records authorization. Today `approveRequest` and `disablePMHoursRequirementDirect` each inline their own SOW update; extract the shared core.

**Files:**
- Modify: `src/lib/pm-hours-removal-service.ts` (add private `applyPMRemoval`, refactor `approveRequest` ~398-510 and `disablePMHoursRequirementDirect` to call it)
- Test: `src/lib/pm-hours-removal-service.enterprise.test.ts` (extend)

**Interfaces:**
- Produces (private, exercised via the two public methods):
  `applyPMRemoval(client, sowId, { requesterId?, approverId? }): Promise<{ success: boolean; pmHoursRemoved?: number; error?: string }>`
  — reads `pricing_roles`, runs `stripProjectManagerFromPricing`, writes
  `{ pm_hours_requirement_disabled: true, ...dates, pm_hours_removed, pm_hours_removal_approved: true, pricing_roles }`.

- [ ] **Step 1: Write the failing test** (assert both entry points strip PM and set the flag)

```ts
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PMHoursRemovalService } from './pm-hours-removal-service';

function mockClient(pricingRoles: unknown) {
  const captured: { sowUpdate?: Record<string, unknown> } = {};
  const client = {
    from(table: string) {
      if (table === 'sows') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { pricing_roles: pricingRoles }, error: null }) }) }),
          update: (p: Record<string, unknown>) => { captured.sowUpdate = p; return { eq: async () => ({ error: null }) }; },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  } as unknown as SupabaseClient;
  return { client, captured };
}

describe('enterprise removal strips PM AND restores OS (single path)', () => {
  it('restores the OS deduction when removing PM', async () => {
    const { client, captured } = mockClient({
      roles: [
        { role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 },
        { role: 'Project Manager', totalHours: 16, ratePerHour: 250 },
      ],
      discount_type: 'none',
    });
    const res = await PMHoursRemovalService.disablePMHoursRequirementDirect('sow-1', 'user-1', client);
    expect(res.success).toBe(true);
    const pricing = captured.sowUpdate?.pricing_roles as { roles: { role: string; totalHours: number }[] };
    const os = pricing.roles.find((r) => r.role === 'Onboarding Specialist');
    expect(os?.totalHours).toBe(35); // 27 + 16/2
    expect(captured.sowUpdate?.pm_hours_requirement_disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run src/lib/pm-hours-removal-service.enterprise.test.ts`
Expected: FAIL — current `disablePMHoursRequirementDirect` already sets the flag, but this asserts OS restoration to 35 via the shared path; it passes only once `applyPMRemoval` is the single routine. (If it already passes because `stripProjectManagerFromPricing` runs, treat Step 3 as a no-behavior refactor and keep the test as a guard.)

- [ ] **Step 3: Refactor to a shared `applyPMRemoval`** used by both `approveRequest` and `disablePMHoursRequirementDirect`. Move the read-strip-write block (currently duplicated at ~448-477 and in `disablePMHoursRequirementDirect`) into one private static method; both callers pass `{ requesterId }` (enterprise) or `{ approverId }` (approval).

- [ ] **Step 4: Run tests**

Run: `./node_modules/.bin/vitest run src/lib/pm-hours-removal-service.enterprise.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pm-hours-removal-service.ts src/lib/pm-hours-removal-service.enterprise.test.ts
git commit -m "refactor(pm-hours): single applyPMRemoval path for enterprise + approval"
```

---

### Task 3: Editor surfaces read PM-inclusion from the table

Make `PricingRolesAndDiscount` and `BillingPaymentTab` derive PM-state and the Project Summary from `getPricingSummary`, and remove the live `roleDistribution` memo and the billing auto-calc re-add effect.

**Files:**
- Modify: `src/components/sow/PricingRolesAndDiscount.tsx` (summary block ~547-665; remove `roleDistribution` memo ~250-258)
- Modify: `src/components/sow/BillingPaymentTab.tsx` (remove auto-calc re-add `if (shouldAddPM && !pm_hours_requirement_disabled)` ~424; mismatch check ~325-357 reads table)
- Test: `src/components/sow/pricing-summary-binding.test.ts` (a focused unit test of the derived summary used by the component — extract the pure mapping if needed)

**Interfaces:**
- Consumes: `getPricingSummary` (Task 1).

- [ ] **Step 1: Write the failing test** — assert the summary the editor shows equals `getPricingSummary(pricing_roles)` and shows no PM/deduction line when no PM row.

```ts
import { describe, it, expect } from 'vitest';
import { getPricingSummary } from '@/lib/sow/pricing-summary';

it('editor summary shows no PM and no deduction when PM row absent', () => {
  const s = getPricingSummary({ roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' });
  expect(s.pmIncluded).toBe(false);
  // The summary panel must render PM/deduction lines ONLY when pmIncluded is true.
  expect(s.total).toBe(8750);
});
```

- [ ] **Step 2: Run test** — Expected: PASS for the read model; this test pins the contract the component must honor.

Run: `./node_modules/.bin/vitest run src/components/sow/pricing-summary-binding.test.ts`

- [ ] **Step 3: Edit `PricingRolesAndDiscount.tsx`** — replace the `roleDistribution`-driven Project Summary (deduction/PM lines gated on `roleDistribution.projectManagerHours`) with values from `const summary = getPricingSummary(toPricingRolesObject(pricingRoles, discountConfig))`. Render the PM line and "deduction" explanation ONLY inside a transient Recalculate result (Task 5), not the persistent panel. Delete the `roleDistribution` `useMemo`.

- [ ] **Step 4: Edit `BillingPaymentTab.tsx`** — delete the auto-calc block that re-adds the PM role (`if (shouldAddPM && !formData.pm_hours_requirement_disabled)`); change the mismatch effect (~325-357) to compare against `getPricingSummary(formData.pricing_roles)` instead of recomputing from products.

- [ ] **Step 5: Run app smoke + tests**

Run: `./node_modules/.bin/vitest run && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/sow/PricingRolesAndDiscount.tsx src/components/sow/BillingPaymentTab.tsx src/components/sow/pricing-summary-binding.test.ts
git commit -m "refactor(pricing): editor derives PM-state and summary from the table"
```

---

### Task 4: Display/PDF/print/approval surfaces use the read model

Replace `pm_hours_requirement_disabled`-as-math reads with `getPricingSummary(...).pmIncluded` in the read-only render surfaces. Leave approval rules/service reading the flag as authorization.

**Files:**
- Modify: `src/components/sow/SOWPrintView.tsx` (~147, 318), `src/components/sow/SOWFullView.tsx` (~367, 587, 758)
- Modify: `src/lib/pdf-generator.ts` (~562, 1244, 1326), `src/app/api/sow/[id]/pdf/route.ts` (~214)
- Do NOT change: `src/lib/approval-workflow-rules.ts`, `src/lib/approval-workflow-service.ts` (flag = authorization, intentionally unchanged)
- Test: `src/lib/pdf-pm-visibility.test.ts`

**Interfaces:**
- Consumes: `getPricingSummary` (Task 1).

- [ ] **Step 1: Write the failing test** — PDF/print PM row visibility follows the table, not the flag.

```ts
import { describe, it, expect } from 'vitest';
import { getPricingSummary } from '@/lib/sow/pricing-summary';

it('PM is shown iff a PM row with hours exists, regardless of flag', () => {
  const withPM = getPricingSummary({ roles: [{ role: 'Project Manager', totalHours: 16, ratePerHour: 250 }], discount_type: 'none' });
  const noPM = getPricingSummary({ roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' });
  expect(withPM.pmIncluded).toBe(true);
  expect(noPM.pmIncluded).toBe(false);
});
```

- [ ] **Step 2: Run test** — Expected: PASS (contract pin).

Run: `./node_modules/.bin/vitest run src/lib/pdf-pm-visibility.test.ts`

- [ ] **Step 3: Edit each render surface** — replace conditions like `sow.pm_hours_requirement_disabled && role.role === 'Project Manager'` (used to hide PM) with `!getPricingSummary(sow.pricing_roles).pmIncluded`-derived logic, or simply rely on PM absence in the rows. Apply at each cited line.

- [ ] **Step 4: Run tests + tsc**

Run: `./node_modules/.bin/vitest run && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/sow/SOWPrintView.tsx src/components/sow/SOWFullView.tsx src/lib/pdf-generator.ts src/app/api/sow/[id]/pdf/route.ts src/lib/pdf-pm-visibility.test.ts
git commit -m "refactor(pricing): render/PDF derive PM visibility from the table"
```

---

### Task 5: Explicit "Recalculate from products" action

Make the products→hours formula a user-triggered write, guarded by `auto_calculated`.

**Files:**
- Modify: `src/components/sow/PricingRolesAndDiscount.tsx` (Recalculate button + confirm; set `auto_calculated=false` on manual row edits in `updateRole` ~363-420)
- Test: `src/lib/sow/recalculate-guard.test.ts`

**Interfaces:**
- Consumes: existing `autoCalculateHours`, `calculateAllHours`, `calculateRoleHoursDistribution`.

- [ ] **Step 1: Write the failing test** — the guard decides whether a confirm is required.

```ts
import { describe, it, expect } from 'vitest';
import { recalculateNeedsConfirm } from './recalculate-guard';

it('requires confirm only when the user has hand-edited', () => {
  expect(recalculateNeedsConfirm({ auto_calculated: true })).toBe(false);
  expect(recalculateNeedsConfirm({ auto_calculated: false })).toBe(true);
  expect(recalculateNeedsConfirm(undefined)).toBe(false);
});
```

- [ ] **Step 2: Run test** — Expected: FAIL (module missing).

Run: `./node_modules/.bin/vitest run src/lib/sow/recalculate-guard.test.ts`

- [ ] **Step 3: Implement `recalculateNeedsConfirm`**

```ts
// src/lib/sow/recalculate-guard.ts
export function recalculateNeedsConfirm(pricing: { auto_calculated?: boolean } | undefined): boolean {
  return pricing?.auto_calculated === false;
}
```

- [ ] **Step 4: Wire the button** — on click, if `recalculateNeedsConfirm(formData.pricing_roles)` show a confirm; on proceed, run `handleRecalculateHours`, write the table, set `auto_calculated=true`, and show the transient derivation breakdown. In `updateRole`, set `auto_calculated=false`.

- [ ] **Step 5: Run tests + tsc** — Expected: PASS, clean.

Run: `./node_modules/.bin/vitest run && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/sow/PricingRolesAndDiscount.tsx src/lib/sow/recalculate-guard.ts src/lib/sow/recalculate-guard.test.ts
git commit -m "feat(pricing): explicit Recalculate action guarded by auto_calculated"
```

---

### Task 6: Backfill stranded-deduction SOWs (dry-run → apply)

**Files:**
- Create: `scripts/backfill-pm-removal-consistency.js`
- Test: `src/lib/sow/backfill-pm-consistency.test.ts` (pure decision function)

**Interfaces:**
- Produces: `classifySow(sow): { action: 'none' | 'restore-os-set-flag'; osTarget?: number; pmHoursRemoved?: number }`
  where base hours come from `calculateAllHours` over the SOW's products (read from the
  same top-level columns the form uses: `products`, `orchestration_units`,
  `bookit_forms_units`, `bookit_handoff_units`, `other_products_units`, `number_of_units`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { classifySow } from './backfill-pm-consistency';

it('flags an EE SOW where PM was removed but OS still carries the deduction', () => {
  const sow = {
    account_segment: 'EE',
    pm_hours_requirement_disabled: false,
    products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
    orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
    pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 }], discount_type: 'none' },
  };
  const r = classifySow(sow);
  expect(r.action).toBe('restore-os-set-flag');
  expect(r.osTarget).toBe(35);
});

it('leaves a consistent SOW alone', () => {
  const sow = { account_segment: 'EE', pm_hours_requirement_disabled: true, products: [], pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }] } };
  expect(classifySow(sow).action).toBe('none');
});
```

- [ ] **Step 2: Run test** — Expected: FAIL (module missing).

Run: `./node_modules/.bin/vitest run src/lib/sow/backfill-pm-consistency.test.ts`

- [ ] **Step 3: Implement `classifySow`** in `src/lib/sow/backfill-pm-consistency.ts` — reconstruct a `template`-like object from the top-level columns, call `calculateAllHours` to get `base`/`shouldAddProjectManager`, and detect: no PM row + `shouldAddProjectManager` + OS hours `< base` ⇒ `restore-os-set-flag` with `osTarget = base`.

- [ ] **Step 4: Run test** — Expected: PASS.

Run: `./node_modules/.bin/vitest run src/lib/sow/backfill-pm-consistency.test.ts`

- [ ] **Step 5: Write the script** `scripts/backfill-pm-removal-consistency.js` — service-role client; `--apply` flag (default dry-run); prints a per-SOW before/after table using `classifySow`; only writes when `--apply`.

- [ ] **Step 6: Dry-run against prod (read-only)**

Run: `set -a; . ./.env.local.prod-backup; set +a; node scripts/backfill-pm-removal-consistency.js`
Expected: a report listing affected SOWs and proposed changes. **Do not apply without review.**

- [ ] **Step 7: Commit**

```bash
git add scripts/backfill-pm-removal-consistency.js src/lib/sow/backfill-pm-consistency.ts src/lib/sow/backfill-pm-consistency.test.ts
git commit -m "feat(pm-hours): backfill script for stranded-deduction SOWs (dry-run default)"
```

---

## Self-Review

**Spec coverage:** §1 read model → Task 1. §2 Recalculate → Task 5. §3 summary-from-table → Task 3. §4 flag split → Tasks 3+4 (math from table) and unchanged approval files. §5 single server path → Task 2. §6 backfill → Task 6. Consumer table → Tasks 3+4. Testing → tests in each task. All spec sections map to tasks.

**Placeholder scan:** New pure modules (`pricing-summary`, `recalculate-guard`, `backfill-pm-consistency`) ship with complete code. Consumer-edit tasks (3, 4) cite exact files/line ranges and the exact read to replace; they intentionally describe edits rather than reprint large JSX blocks, but each names the precise condition to change and the replacement call.

**Type consistency:** `getPricingSummary` returns `pmIncluded`/`total`/`subtotal`/`totalHours` consistently across Tasks 1, 3, 4. `applyPMRemoval` (Task 2) and `classifySow` (Task 6) signatures are defined where introduced.

**Note for implementers:** Tasks 3 and 4 touch live React components; verify by running the app (not just tests) — drive the Enterprise PM-removal flow and confirm no stranded deduction across save/reload, per the spec's regression requirement.
