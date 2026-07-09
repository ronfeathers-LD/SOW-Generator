# P4c Commercial Verbiage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Two commercial-language corrections validated by the ENT questionnaire (Erin/Ryan): (c1) overage billed at the **Standard** Rate/Hr, and (c2) a new payment-terms default with the Billing Information block reordered so Payment Terms leads.

**Architecture:** Pure copy/verbiage + render-order changes across the three SOW output surfaces (SOWPrintView, SOWFullView, pdf-generator) plus one shared default constant. No schema, no data migration. Existing SOWs keep their stored `payment_terms` value (the old default reads fine in either position).

**Tech Stack:** Next.js 15 / TypeScript / Vitest. Spec: `docs/superpowers/specs/2026-07-08-ent-structures-design.md` §P4c.

**Structure:** ONE cohesive task (c1 + c2). Both changes touch the same three render surfaces; splitting them would make two implementers fight over the same files. A single implementer does both, then one review.

## Global Constraints

- Tests are Vitest, co-located `src/**/*.test.ts` — NEVER `__tests__/` (vitest.config excludes them → a test there silently never runs).
- `npm test` (currently 316 passing) and `npm run build` must both pass at the end. Use `PUPPETEER_SKIP_DOWNLOAD=true npm run build` if build tries to download Chrome.
- Never commit `next-env.d.ts`.
- Do NOT change pricing math, the pricing table, or `PricingDisplay`. c1 is a one-sentence copy change in the T&M paragraph only. The pricing table's rate columns are already labeled correctly (pdf-generator already uses "Standard Rate/Hr" for its standard column) — do not touch them.
- All three surfaces must stay consistent with each other (same wording, same field order).

---

### Task 1: P4c commercial verbiage (c1 + c2)

**Files:**
- Modify: `src/components/sow/SOWPrintView.tsx`
- Modify: `src/components/sow/SOWFullView.tsx`
- Modify: `src/lib/pdf-generator.ts`
- Modify: `src/lib/sow-content.ts` (the `DEFAULT_PAYMENT_TERMS` constant)
- Modify: `src/lib/sow-content.test.ts` (assert the new default value)

**Context:** Verified against `origin/main` (dba56a5). The T&M paragraph is identical in the two React views and near-identical (no `<span>`) in the PDF string. The Billing Information block currently renders Company Name → Billing Contact → Address → Email → PO Number → Payment Terms (last, conditional) in all three surfaces.

#### c1 — Overage at the Standard rate

- [ ] **Step 1: Change the three T&M paragraph strings.** In each file, change exactly `billed at the Rate/Hr.` → `billed at the Standard Rate/Hr.` (leaving the rest of the sentence and any `<span className="font-bold">` wrapper intact):
  - `src/components/sow/SOWPrintView.tsx:322` — inside `<span className="font-bold">Additional hours will be billed at the Rate/Hr.</span>`
  - `src/components/sow/SOWFullView.tsx:767` — same span
  - `src/lib/pdf-generator.ts:1443` — plain text (no span): `Additional hours will be billed at the Rate/Hr.`

  (Line numbers are from origin/main; match on the string, not the line.)

#### c2 — Payment terms default + block reorder

- [ ] **Step 2: Write/extend the failing test** in `src/lib/sow-content.test.ts` (the file already exists). Add:
  ```typescript
  import { DEFAULT_PAYMENT_TERMS } from './sow-content';

  it('DEFAULT_PAYMENT_TERMS leads with the monthly-billing + "following Customer contact" language', () => {
    expect(DEFAULT_PAYMENT_TERMS).toBe(
      'Billed monthly, as incurred. Monthly fees shall be due upon receipt and sent to the following Customer contact:'
    );
  });
  ```
  (If `sow-content.test.ts` doesn't already import from `./sow-content`, add the import; otherwise extend the existing import. Place the `it()` inside a sensible existing/`describe` block.)

- [ ] **Step 3: Run to verify failure** — `npm test -- sow-content` → FAIL (old value).

- [ ] **Step 4: Update the constant** — `src/lib/sow-content.ts:35-36`:
  ```typescript
  export const DEFAULT_PAYMENT_TERMS =
    'Billed monthly, as incurred. Monthly fees shall be due upon receipt and sent to the following Customer contact:';
  ```

- [ ] **Step 5: Reorder the Billing Information block** in all three surfaces so **Payment Terms renders FIRST**, followed by Company Name → Billing Contact Name → Billing Address → Billing Email → Purchase Order Number. Move the payment-terms element (dt/dd pair in the React views; the `.billing-grid` div in the PDF) to the FRONT of its block as a unit, keeping its existing conditional guard (`sow.payment_terms &&` / `sowData.payment_terms ?`) intact — do not make it unconditional, do not drop the guard. The rest of the fields keep their current relative order.
  - `src/components/sow/SOWFullView.tsx` — block at ~769-808; payment-terms currently at ~801-806.
  - `src/components/sow/SOWPrintView.tsx` — block at ~324-362; payment-terms currently at ~356-361.
  - `src/lib/pdf-generator.ts` — `.billing-grid` at ~1451-1484; payment-terms conditional at ~1476-1481.

  Rationale: the new default ends "…sent to the following Customer contact:", so the contact fields must follow it to read correctly.

- [ ] **Step 6: Full gates** — `npm test` (317 = 316 + 1 new) and `PUPPETEER_SKIP_DOWNLOAD=true npm run build` → both pass. Then `git grep -n "billed at the Rate/Hr"` must return ZERO hits (confirms all three c1 sites changed) and `git grep -n "Standard Rate/Hr"` should show the three paragraph sites plus the pre-existing pdf table label.

- [ ] **Step 7: Commit** — `git add -A` (staging only the 5 source/test files; do NOT stage `.superpowers/` scratch or the plan doc) then:
  `git commit -m "feat(sow): overage at Standard Rate/Hr + payment-terms-first billing block"`

### Task 2 (verify-only, controller): no dispatch
Confirm on staging after deploy (design §P4c verification): print/full/PDF show "Standard Rate/Hr"; a new SOW's billing block leads with the new payment-terms line followed by the contact fields, reading as one sentence. Existing SOWs keep their stored `payment_terms` and still render (in the new leading position).
