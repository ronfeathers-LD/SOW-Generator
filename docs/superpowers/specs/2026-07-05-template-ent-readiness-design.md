# Template ENT-Readiness (ENT Roadmap Phase 3, trimmed) — Design

**Date:** 2026-07-05
**Status:** Approved design (scope trimmed per review: no section gating until Phase 4)
**Parent:** `2026-07-04-ent-readiness-and-simplification-assessment.md` §6 Phase 3; ENT mining §4.2 items #5, #6, and the per-segment template variants

## Scope

1. **Payment Terms block** (universal) — un-TODO it in all render paths, backed by an editable field.
2. **Appendix A: Change Request Form** (universal) — the static appendix present in every LeanData-paper ENT SOW but missing from app output.
3. **Per-segment content-template variants** — ENT SOWs can get different default section content at creation.

Out (deliberately): tab/section gating (Phase 4), engagement types, pricing structures, customer-paper export (Phase 5).

## 1. Payment Terms

**Facts:** The block is commented-out TODO markup in `SOWPrintView.tsx:355-373` (and a twin in `SOWFullView.tsx:801-812`); the PDF generator hand-writes its own billing markup (`pdf-generator.ts:1361-1389`) — three render sites total. No `payment_terms` field exists anywhere.

**Design:**
- New column `sows.payment_terms TEXT NOT NULL DEFAULT ''` (migration).
- At SOW creation, default to the standard language every mined LeanData-paper SOW carries: **"Billed monthly, as incurred; payment due upon receipt."** (constant `DEFAULT_PAYMENT_TERMS` in `src/lib/sow-content.ts`).
- Editable single-line field in `BillingInformationTab` (labeled "Payment Terms", below PO Number), persisted via the Billing tab payload (`tab-payloads.ts` case gains the field) and PATCH allowlist.
- Rendered as a `dt/dd` pair after Purchase Order Number in all three sites (print view, full view, PDF), shown only when non-empty. The old TODO comments are deleted.
- Not per-segment (mined docs show the same terms across segments; customer-paper deals override on their own forms anyway).

## 2. Appendix A: Change Request Form

**Facts:** No appendix exists (`grep -i appendix src/` = 0). Both renderers end at "6. ASSUMPTIONS" + AI disclaimer. The change-order PDF (`pdf-generator.ts:1746-1800+`) already renders the exact form layout (details table, category checkboxes, reason/description boxes, signer blocks) — reusable as the static blank form.

**Design:**
- New shared markup: "Appendix A: Change Request Form" — a static, **blank** form matching the change-order document's structure: intro sentence ("Changes to this SOW are managed via the following form…"), details table (Project Name / Change Requestor / Change Number / Associated PO — blank ruled cells), Change Category checkbox row (Schedule, Cost, Scope, Testing (Quality), Resources, Artifacts — all unchecked), ruled Reason for Change and Change Description boxes, and dual signature blocks (Customer / LeanData: name, title, signature, date lines).
- Rendered AFTER the Assumptions section and BEFORE the AI disclaimer, in both the print view (`SOWPrintView`, new `<div id="appendix-a">`) and the PDF (`pdf-generator.ts`, new page block with a page-break before it). `SOWFullView` also gets it for parity.
- Hardcoded markup (not a content template): it's a form layout, not prose — YAGNI on admin editability. One shared source where the two React views can share a component (`src/components/sow/AppendixChangeRequestForm.tsx`); the PDF generator gets its own HTML string block (its established pattern — all its markup is hand-written strings).
- No data model changes; the form is intentionally blank (filled by hand/at CO time).

## 3. Per-segment content-template variants

**Facts (load-bearing):**
- `sow_content_templates`' **live shape has drifted from repo migrations** (live: `section_name/section_title/default_content/...`; migrations 002/005 define `name/content JSONB`). Content is DB-only, no repo seed, no unique constraints. Any migration must be **additive-only against the live shape** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Creation copies templates → `custom_*` columns in `POST /api/sow` (`route.ts:34-56` builds `Map(section_name → default_content)`, insert at `:137-141`); `account_segment` is available in the same handler (`route.ts:106`).
- Observed pre-existing gap, NOT touched by this design: `out-of-scope` templates are fetched but never copied at creation.

**Design:**
- Migration: `ALTER TABLE sow_content_templates ADD COLUMN IF NOT EXISTS segment TEXT NULL;` — `NULL` = global/default row (all existing rows stay global). **No DB unique constraint** (live data unverifiable against drift); uniqueness of `(section_name, segment)` is enforced in the admin API (reject duplicates on POST/PUT with 409).
- Resolution at creation: normalize the SOW's segment (`normalizeSegment` from Phase 1), then per section prefer the row where `segment = <code>`, else the `segment IS NULL` row. Implemented as a pure helper `resolveTemplatesForSegment(rows, segment): Map<sectionName, defaultContent>` in `src/lib/sow-content.ts` (tested), used by `route.ts`.
- Admin (`/admin/sow-content-templates` + its API): template rows gain a **Segment** selector — `Global (default)` / the four codes with display names fetched from segment_rules (fallback to `DEFAULT_SEGMENT_RULES`). The section list UI shows which variants exist per section (e.g. chips: `Global`, `LE`, `EE`). Editing keyed by `(section_name, segment)`. POST requires section+title+content as today, `segment` optional/null.
- An admin wanting one "ENT" variant creates LE and EE rows (a "duplicate to segment…" action on a row makes this one click). Two-tier grouping stays a rules-values concern, not a schema concern (consistent with Phase 1).
- PDF/print untouched by this feature (content is copied at creation; renderers read `custom_*` columns — same as today).

## Verification (staging)

- Payment Terms: new SOW shows the default terms in Billing tab; edit persists (autosave); print view + PDF + full view all render it; blank hides the row.
- Appendix A: print view and PDF of any SOW end with Assumptions → Appendix A (blank form, page-broken in PDF) → disclaimer.
- Segment variants: create an LE variant of `intro` in admin → new SOW on an LE account gets the variant in its intro content; an MM account gets the global; deleting the variant restores global for future SOWs; duplicate `(section, segment)` rejected with 409.

## Test surface

Pure/unit: `resolveTemplatesForSegment` (global fallback, segment preference, missing section, normalization); `DEFAULT_PAYMENT_TERMS` wiring in the creation payload builder if extracted; admin API duplicate rejection (route logic covered by build + staging).
