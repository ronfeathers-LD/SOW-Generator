# Template ENT-Readiness Implementation Plan (ENT Roadmap Phase 3, trimmed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Payment Terms block, the static Appendix A change-request form, and per-segment content-template variants.

**Architecture:** Three independent features. Payment Terms = one column + default constant + Billing-tab field + three render sites. Appendix A = one shared React component (print/full views) + one HTML block (PDF generator). Segment variants = additive column on the drifted `sow_content_templates` table + a pure resolution helper at creation + admin segment selector with API-level uniqueness.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Vitest (`npm test`), Tailwind, Puppeteer (PDF).

**Spec:** `docs/superpowers/specs/2026-07-05-template-ent-readiness-design.md` — read it; its "Facts" blocks carry the scouted file/line map (SOWPrintView TODO at :355-373, PDF billing at :1361-1389, creation copy at route.ts:34-56 + :137-141, CO form markup at pdf-generator.ts:1746-1800).

## Global Constraints

- `sow_content_templates` migrations have DRIFTED from the live DB (live columns `section_name/section_title/default_content` exist only in the database). The segment migration must be **additive-only**: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS segment TEXT NULL;` — nothing else touches that table's DDL. NO unique constraint in the DB; the admin API enforces `(section_name, segment)` uniqueness with 409.
- Default payment terms text, verbatim: `Billed monthly, as incurred; payment due upon receipt.`
- Existing template rows must keep working unchanged (`segment IS NULL` = global). Existing SOWs are untouched (content copies at creation only).
- Tests: Vitest, co-located `src/**/*.test.ts`. Gates per task: `npm test` green + `npm run build`. Ignore the pre-existing worktree lint failure. Don't commit `next-env.d.ts`.
- Branch `feat/template-ent-readiness` in an isolated worktree. Check `gh pr list` for overlap first. Staging verify at the end; NO prod promote.
- Migration numbering: next free after `033` (check `ls supabase/migrations/ | sort`; expect `034`).
- Apply new migrations to STAGING when created (psql command pattern: `PGPASSWORD=$(cat ~/.sow-staging-db-password) psql "postgresql://postgres.kajhbohmzkizydvuxnbt@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -f <file>`); prod apply is flagged in the PR body for release time.

---

### Task 1: Payment Terms — data + default

**Files:**
- Create: `supabase/migrations/034_add_payment_terms.sql`
- Modify: `src/lib/sow-content.ts` (add `DEFAULT_PAYMENT_TERMS`)
- Modify: `src/app/api/sow/route.ts` (creation default), `src/app/api/sow/[id]/route.ts` (PATCH allowlist — find the allowlist array and add `payment_terms`)
- Modify: `src/types/sow.ts` (SOWData field), `src/lib/sow/map-sow-response.ts` (passthrough — study how sibling billing fields map)
- Modify: `src/lib/sow/tab-payloads.ts` (Billing Information case gains `payment_terms`)
- Test: extend `src/lib/sow/map-sow-response.test.ts` (passthrough) — plus any tab-payloads test if one exists (check).

**Interfaces:**
- Produces: `sows.payment_terms` column; `DEFAULT_PAYMENT_TERMS = 'Billed monthly, as incurred; payment due upon receipt.'` exported from `@/lib/sow-content`; `formData.payment_terms: string` available to Tasks 2-3.

Migration:
```sql
-- 034_add_payment_terms.sql
ALTER TABLE sows ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '';
```
Creation: in the POST insert payload, `payment_terms: DEFAULT_PAYMENT_TERMS`. Read the handler first; place it near the other content defaults (~:137).

- [ ] Step 1: failing test (mapper passthrough: `''` stays `''`, value passes; creation default is covered by build + staging).
- [ ] Step 2: run to fail. Step 3: implement all wiring. Step 4: `npm test` + `npm run build`. Step 5: apply migration to staging (psql). Step 6: Commit — `feat(billing): payment_terms field with standard default`

---

### Task 2: Payment Terms — Billing tab field

**Files:**
- Modify: `src/components/sow/BillingInformationTab.tsx` (read it first; add a "Payment Terms" text input below Purchase Order Number, bound to `formData.payment_terms`, onChange → setFormData marking dirty — global autosave persists it; match the tab's existing input idioms + dark mode).

- [ ] Step 1: implement. Step 2: gates. Step 3: Commit — `feat(billing): editable Payment Terms field`

---

### Task 3: Payment Terms — render in all three sites

**Files:**
- Modify: `src/components/sow/SOWPrintView.tsx` (:352-373 — replace the TODO comments with a live `dt/dd` pair after PO Number, rendered only when `payment_terms` non-empty; delete the commented blocks)
- Modify: `src/components/sow/SOWFullView.tsx` (:801-812 twin — same treatment, matching its markup idiom)
- Modify: `src/lib/pdf-generator.ts` (:1361-1389 billing grid — add the label/value pair after Purchase Order Number, same conditional; check how the generator sources SOW fields ~lines 210-218 and add `payment_terms` there)

- [ ] Step 1: implement all three. Step 2: gates (`npm test` + `npm run build`). Step 3: Commit — `feat(billing): render Payment Terms in print, full view, and PDF`

---

### Task 4: Appendix A — shared component + PDF block

**Files:**
- Create: `src/components/sow/AppendixChangeRequestForm.tsx` — static presentational component, no props needed (or `variant?: 'print'` if the two views' typography demands it). Structure per spec §2: title "Appendix A: Change Request Form", intro sentence, details table (Project Name / Change Requestor / Change Number / Associated PO — blank ruled cells), Change Category checkbox row (Schedule, Cost, Scope, Testing (Quality), Resources, Artifacts — unchecked squares, e.g. ☐ glyphs or bordered spans), ruled "Reason for Change" and "Change Description" boxes (fixed-height bordered divs), dual signature blocks (Customer / LeanData: Name, Title, Signature, Date lines). Model the layout on the change-order document markup at `pdf-generator.ts:1746-1800` and the mined LeanData-paper appendix descriptions.
- Modify: `src/components/sow/SOWPrintView.tsx` — render `<AppendixChangeRequestForm />` in a `<div id="appendix-a">` AFTER the Assumptions section (:378-385) and BEFORE the AI disclaimer (:387).
- Modify: `src/components/sow/SOWFullView.tsx` — same placement for parity.
- Modify: `src/lib/pdf-generator.ts` — new page block (`<!-- PAGE 9: APPENDIX A -->` with the generator's page-break class — read how PAGE 8 breaks) between the Assumptions page and the disclaimer, hand-written HTML mirroring the component (the generator's established string-building pattern).

- [ ] Step 1: build component + mount in both views. Step 2: PDF block. Step 3: gates. Step 4: Commit — `feat(sow): Appendix A change request form in document output`

---

### Task 5: Segment template variants — resolution + migration

**Files:**
- Create: `supabase/migrations/035_add_segment_to_content_templates.sql` — exactly: `ALTER TABLE sow_content_templates ADD COLUMN IF NOT EXISTS segment TEXT NULL;` (comment explaining NULL=global and the drift constraint).
- Modify: `src/lib/sow-content.ts` — add pure `resolveTemplatesForSegment(rows: Array<{section_name: string; default_content: string; segment?: string | null}>, segment: string | null | undefined): Map<string, string>` — normalizes the segment (`normalizeSegment` from `@/lib/segment-rules`), prefers the exact-segment row per section, falls back to the NULL-segment row; rows with a non-matching segment are ignored.
- Create: `src/lib/sow-content.test.ts` (or extend if exists) — cases: global-only rows resolve for any segment; LE variant preferred for LE, ignored for MM; MidMarket normalizes to MM; missing section absent from map; null/unknown segment gets globals only.
- Modify: `src/app/api/sow/route.ts` — the template-copy block (:34-56): fetch adds no filter change (still all active rows); replace the manual `Map` build with `resolveTemplatesForSegment(templates, data.selectedAccount?.Employee_Band__c || data.selectedAccount?.accountSegment)`. Keep the same five `templateMap.get(...)` consumers (do NOT wire `out-of-scope` — pre-existing gap, out of scope).

- [ ] Step 1: failing tests. Step 2: fail. Step 3: implement helper + route swap. Step 4: `npm test` + `npm run build`. Step 5: apply migration 035 to staging. Step 6: Commit — `feat(templates): per-segment content template resolution at SOW creation`

---

### Task 6: Segment template variants — admin

**Files:**
- Modify: `src/app/api/admin/sow-content-templates/route.ts` — POST accepts optional `segment` (validate: null or one of LE/EE/MM/EC); before insert, check for an existing active row with same `(section_name, segment)` → 409 with a clear message.
- Modify: `src/app/api/admin/sow-content-templates/[id]/route.ts` — PUT same validation/uniqueness check when section_name/segment change.
- Modify: `src/app/admin/sow-content-templates/page.tsx` — read the page first (hardcoded section list in useMemo :15-22, row matching by section_name :111). Add: a Segment selector (Global + the four codes with display names from `DEFAULT_SEGMENT_RULES` — static import is fine for labels) on the create/edit surface; per-section variant chips showing which segments have rows (Global/LE/EE/MM/EC); editing addresses rows by `(section_name, segment)`; a "Duplicate to segment…" action that copies a row's content to a chosen segment (POST with the same content + new segment).

- [ ] Step 1: API changes. Step 2: page changes. Step 3: gates. Step 4: Commit — `feat(templates): segment variants in content-template admin`

---

### Task 7: Final review + PR + staging verification

- [ ] Full gates: `npm test && npm run build`.
- [ ] Whole-branch review (final reviewer) with the spec's Verification section as checklist; fix wave if needed.
- [ ] Push `feat/template-ent-readiness`, PR referencing the spec; PR body: migrations **034 + 035 applied to staging, need prod apply at release**; staging-verification checklist; no prod promote.
- [ ] Post-merge staging browser verify per spec §Verification (payment terms end-to-end incl. PDF, Appendix A in print + PDF, LE variant resolution + 409 on duplicate).
