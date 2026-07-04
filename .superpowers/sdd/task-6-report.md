# Task 6 Report: Backfill stranded-deduction SOWs

## Status

COMPLETE. All checks pass: 191 tests (6 new), 0 tsc errors, `node --check` clean.

---

## Part 1 — Classifier (`src/lib/sow/backfill-pm-consistency.ts`)

### What it does

`classifySow(sow)` takes a flat SOW DB row and returns
`{ action: 'none' | 'restore-os-set-flag', osTarget?, pmHoursRemoved? }`.

### Template reconstruction from columns

The classifier reconstructs a `Partial<SOWTemplate>`-shaped object from the SOW's top-level columns — exactly the same fields the SOW form passes to `calculateAllHours`:

```ts
const template = {
  products:              sow.products ?? [],
  number_of_units:       sow.number_of_units,
  orchestration_units:   sow.orchestration_units,
  bookit_forms_units:    sow.bookit_forms_units,
  bookit_links_units:    sow.bookit_links_units,
  bookit_handoff_units:  sow.bookit_handoff_units,
  other_products_units:  sow.other_products_units,
  units_consumption:     sow.units_consumption,
};
const { baseProjectHours, shouldAddProjectManager } = calculateAllHours(template, sow.account_segment);
```

`calculateAllHours` (from `@/lib/hours-calculation-utils`) already handles the
`number_of_units` / `orchestration_units` precedence rule (prefer whichever is
non-zero, never sum them) and the max-BookIt-units logic, so no duplication.

### Detection logic

1. If `pm_hours_requirement_disabled` is true → `action: 'none'` (already healed).
2. If `shouldAddProjectManager` is false → `action: 'none'` (PM was never required).
3. If a `Project Manager` row exists in `pricing_roles` → `action: 'none'` (PM is present, no stranding).
4. If OS hours < `baseProjectHours` → **stranded class** → `action: 'restore-os-set-flag'`.
5. Otherwise (OS hours ≥ base) → `action: 'none'` (clean removal, OS already restored).

### OS/pmHoursRemoved math

When PM is present, `calculateRoleHoursDistribution` sets OS to `base − pmHours/2`.
The inverse: if OS carries the deduction then `base − currentOsHours = pmHours/2`,
so `pmHoursRemoved = (base − currentOsHours) × 2`.

The test case verifies: base=35, currentOs=27 → (35−27)×2 = **16 PM hours**.

---

## Part 2 — Tests (`src/lib/sow/backfill-pm-consistency.test.ts`)

### TDD Evidence

**Step 2 (RED):**
```
Error: Cannot find module './backfill-pm-consistency'
Test Files  1 failed (1)
Tests  no tests
```

**Step 4 (GREEN):**
```
Test Files  1 passed (1)
Tests  6 passed (6)
```

### Test cases

| # | Description | Expected |
|---|-------------|----------|
| 1 | EE SOW — PM stripped, OS at 27 (deducted from base 35) | `restore-os-set-flag`, osTarget=35 |
| 2 | SOW with pm_hours_requirement_disabled=true | `none` |
| 3 | PM removed but OS already at base (clean removal) | `none` |
| 4 | PM row still present in pricing_roles | `none` |
| 5 | SOW with only 2 products (PM not required) | `none` |
| 6 | pmHoursRemoved math: (35−27)×2 = 16 | `pmHoursRemoved=16` |

---

## Part 3 — Script (`scripts/backfill-pm-removal-consistency.js`)

### Design

Plain CJS (`require`). No CLI framework — `--apply` flag via `process.argv.includes`.

The `classifySow` logic is **reimplemented inline** in the script (not imported from TS) to avoid a build/compile dependency. The inline version mirrors the TS exactly and uses the same product UUID sets from `src/lib/constants/products.ts`.

### Dry-run behavior (default)

1. Creates a service-role Supabase client from `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
2. Fetches all non-hidden/deleted SOWs, selecting only the columns the classifier needs.
3. Runs `classifySow` on each SOW.
4. Prints a per-SOW before/after table:
   ```
   SOW ID    | Client     | Seg | OS hours (now) | OS target | PM hrs removed | Status
   ----------|------------|-----|----------------|-----------|----------------|--------
   <uuid>    | Acme Corp  | EE  | 27             | 35        | 16             | DRY-RUN
   ```
5. Exits without writing anything.

### Apply behavior (`--apply`)

For each affected SOW:
1. Calls `restoreOsHours(pricingRoles, osTarget)` — updates OS row's `totalHours` to `osTarget`, recomputes `subtotal`/`discount_total`/`total_amount` in the same JSON shape (object or bare-array).
2. Updates the SOW row:
   ```js
   {
     pm_hours_requirement_disabled:      true,
     pm_hours_requirement_disabled_date: now,
     pm_hours_removed:                   pmHoursRemoved,
     pm_hours_removal_approved:          true,
     pm_hours_removal_date:              now,
     pricing_roles:                      updatedPricingRoles,
   }
   ```
   This mirrors the `applyPMRemoval` write shape in `src/lib/pm-hours-removal-service.ts`.

### Constraint compliance

Script was **not run against any database**. Classifier is tested in isolation via vitest.

---

## Verification

```
./node_modules/.bin/vitest run → 19 files, 191 tests, 0 failures
npx tsc --noEmit              → 0 errors
node --check scripts/backfill-pm-removal-consistency.js → syntax OK
```

---

## Self-Review

- **Spec §6 coverage**: classifier detects stranded class, script reports dry-run table, --apply writes the correct fields in the correct shape.
- **Math**: `pmHoursRemoved = (base − currentOsHours) × 2` is the exact inverse of `calculateRoleHoursDistribution`'s `onboardingHours = base − pmHours/2`.
- **Edge cases handled**: bare-array pricing_roles shape, missing OS row (treated as 0 hours → would trigger flag only if base > 0), SOWs with no products, SOWs already flagged.
- **No compile dependency**: script is standalone CJS. The TS classifier lives separately and is the source-of-truth for the logic; the script inlines a JS copy.
- **Not run against DB**: the dry-run step (task brief §6) is left for the human/controller to execute.
- **gitignore note**: `scripts/` is gitignored for this repo's local-utility scripts. The backfill script was force-added (`git add -f`) since it is an intentional tracked migration artifact, consistent with the task brief's explicit `git add` instruction.

---

## Fix: BookIt Links / shouldAddPM divergence

### Before (script's `shouldAddPM`)

```js
function shouldAddPM(sow) {
  const products = (sow.products || []).filter(p => p !== BOOKIT_LINKS_ID);
  return products.length >= 3 || getTotalUnits(sow) >= 200;
}
```

BookIt Links UUID was excluded from the product count, so a 3-product SOW where one product is BookIt Links would yield `products.length === 2` → `shouldAddPM = false` → SOW skipped (false negative).

### After

```js
function shouldAddPM(sow) {
  // INTENTIONALLY mirrors the deployed app's behavior in shouldAddProjectManager
  // (src/lib/hours-calculation-utils.ts).  That function attempts to filter out
  // BookIt Links via:
  //   products.filter(product => product !== PRODUCT_IDS.BOOKIT_LINKS)
  // where PRODUCT_IDS.BOOKIT_LINKS is the SLUG string 'bookit-links'.  Because
  // DB products are UUIDs, the slug-vs-UUID comparison is always false — the
  // filter is a no-op and BookIt Links IS counted toward the ≥3-product PM
  // threshold in the running app.
  //
  // Do NOT add a UUID exclusion here to "fix" that: correcting the business rule
  // is out of scope for this backfill.  The backfill's job is to find SOWs that
  // are actually stranded in production, so it must match deployed reality exactly.
  const products = sow.products || [];
  return products.length >= 3 || getTotalUnits(sow) >= 200;
}
```

BookIt Links is now counted. A SOW with products `[Lead Routing UUID, Contact Routing UUID, BookIt Links UUID]` → `products.length === 3` → `shouldAddPM = true`, matching the TS classifier.

### Verification

```
node --check scripts/backfill-pm-removal-consistency.js → OK
./node_modules/.bin/vitest run → 19 files, 191 tests, 0 failures
npx tsc --noEmit → 0 errors
```

Commit: `a08852e fix(backfill): count BookIt Links toward PM threshold to mirror deployed app`

---

## Fix: empty/no-OS false positives

### Problem (dry-run on real prod data)

Of 11 SOWs flagged as `restore-os-set-flag`, 9 were false positives: their
Onboarding Specialist hours resolved to 0 because `pricing_roles` was empty
(e.g. Anthropic, TimeScaleDB had completely empty `pricing_roles`) or contained
no OS row at all.  `currentOsHours = 0 < base` triggered the flag — but applying
the fix would have **invented** an OS row at base hours and set the removal flag,
corrupting drafts that had never had pricing entered.

Only 2 SOWs were genuine stranded cases (OS=27→35, OS=25→30).

### Guard added (both `src/lib/sow/backfill-pm-consistency.ts` and `scripts/backfill-pm-removal-consistency.js`)

**Before:**
```ts
if (currentOsHours < baseProjectHours) {
  return { action: 'restore-os-set-flag', ... };
}
```

**After:**
```ts
// Guard: only flag when an OS row ACTUALLY EXISTS with hours > 0.
// Missing/empty OS → not stranded, never priced.
if (osRole && currentOsHours > 0 && currentOsHours < baseProjectHours) {
  return { action: 'restore-os-set-flag', ... };
}
```

The same guard was applied identically to the inline classifier in the JS script.

### New tests (`src/lib/sow/backfill-pm-consistency.test.ts`)

Three cases added (written RED before the guard, GREEN after):

| # | Description | Expected |
|---|-------------|----------|
| 7 | `pricing_roles: { roles: [] }` — completely empty roles array | `none` |
| 8 | Roles present but no Onboarding Specialist row | `none` |
| 9 | OS row exists with `totalHours: 0` | `none` |

### Verification

```
./node_modules/.bin/vitest run src/lib/sow/backfill-pm-consistency.test.ts
  → 9 tests, 9 passed (3 new cases were RED before guard, GREEN after)

./node_modules/.bin/vitest run → all tests pass
npx tsc --noEmit              → 0 errors
node --check scripts/backfill-pm-removal-consistency.js → OK
```
