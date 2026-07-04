# ENT-Readiness & Simplification Assessment

**Date:** 2026-07-04
**Author:** Ron Feathers (with Claude)
**Status:** Working document — internal assessment + roadmap. Not yet an implementation spec; each roadmap phase gets its own spec when picked up.

---

## 1. Why this document

Two pressures, examined together because they reinforce each other:

1. **Simplification.** The app has accreted friction — the SOW form is a 4-phase / 8-tab wizard with a second 5-step wizard nested inside it, three different save paradigms, and defaults that fail the app's own validation. Approval rework is heavy (staging snapshot: 23 approved vs **19 rejected** — nearly 1:1).
2. **Enterprise-readiness.** ENT deals differ in **content** (scope language, engagement structure, commercial terms), in **process** (approval chains, legal/procurement cycles), and there is org pressure for team-specific workflows. Today the app treats every SOW identically except for two hardcoded segment behaviors.

The unifying thesis: **segmentation should be a subtraction tool, not an addition.** The Commercial/MidMarket path (most deals) gets *less* — fewer fields, lighter process. The ENT path gets the capabilities Enterprise deals demonstrably need (per mining of 8 real ENT SOWs, §4). Several "ENT needs" turn out to be missing capabilities that help every deal; those ship as universal fixes, not branches.

### Method

- **Live UX walkthrough** of staging (full prod-data copy) — created a SOW end-to-end on a real SF account, inspected reject/approve surfaces.
- **Codebase analysis** — form composition, approval rules, pricing SSOT, template system, segment plumbing (file refs throughout).
- **Mining of 8 real Enterprise SOWs** from Google Drive — Dell, Rockwell Automation, Veeam, CDW, ZoomInfo, Unum, OpenAI, RL Polk — compared against the app's template.

Decisions already made in review (2026-07-04):
- **Deliverable:** assessment + sequenced roadmap first; implementation specs per phase after.
- **Segment model: two tiers** — **ENT = LE + EE**, **Core = MM + EC** — matching the existing PM-hours-removal split. Config stores rules per segment under the hood so finer splits stay cheap.

---

## 2. Current state (what exists today)

### 2.1 The flows

- **Create:** 3-step pre-wizard (Customer search → Opportunity → create) → lands in the edit form.
- **Edit:** 4 phases → 8 tabs: Customer, Project (title/config/products) → Objectives (nested 5-step AI wizard), Content (per-section TipTap w/ admin templates) → Billing, Pricing → Signers & Roles, Review & Submit. Orchestrated by `src/components/SOWForm.tsx` (~1,500 lines); heaviest tabs: `TeamRolesTab` (~1,250), `PricingRolesAndDiscount` (~1,130), `ContentEditingTab` (~760).
- **Approve:** up to 3 parallel-visible stages — Professional Services (always), Project Management (if PM hours), Sr. Leadership (always). Stage rows in DB (`approval_stages`), but *which stages apply* is hardcoded in `src/lib/approval-workflow-rules.ts`.
- **Output:** print view → Puppeteer PDF → Google Drive upload.

### 2.2 Segmentation plumbing (solid foundation)

- Salesforce `Employee_Band__c` → `LE / EE / MM / EC` (fallback computed from `NumberOfEmployees`): `src/lib/salesforce.ts:348-376`.
- Snapshotted to `sows.account_segment` at creation (`src/app/api/sow/route.ts:99`); self-healing backfill on read (`src/app/api/sow/[id]/route.ts:92-115`); carried through revisions; shown read-only in the form header ("Using \"MM\" project guidelines").
- **Existing segment-driven behavior (both hardcoded literals):**
  1. `EE|LE` → self-serve PM-hours removal, skips PMO (`PricingRolesAndDiscount.tsx:145`, `pm-hours-removal-service.ts:554-596`).
  2. `MM` → +5 hours bump (`src/lib/hours-calculation-utils.ts:128`).

### 2.3 Config patterns available

A well-established DB-config convention (`is_active`, admin page, `/api/admin/*` route, `src/lib/<thing>-config.ts` helper with fallback): `gemini_configs`, `pricing_roles_config`, `approval_stages`, `sow_content_templates`, etc. A `segment_rules` table can follow this template exactly.

---

## 3. UX audit findings

Ordered by impact. Evidence from the 2026-07-04 staging walkthrough unless noted.

### F1. The objectives wizard forces 5 steps even when empty (HIGH)
With Drive returning nothing and no Avoma calls selected, the user still marches: Document Selection → Avoma Calls → Content Preview (empty textarea) → AI Generation, where a caption finally reveals *"…or continue to Final Edit to write objectives manually."* The manual path — arguably the common path for renewals/simple deals — is discoverable only at step 4 of 5.
**Direction:** invert the flow. Objectives tab opens on an editable objectives editor; "Generate with AI" is a single action that expands source-picking (Drive/Avoma) inline. AI becomes an accelerator you opt into, not a corridor you escape from.

### F2. Rejection experience fuels the rework loop (HIGH)
Whole-document reject; the rejection banner shows a free-text comment (observed: *"Please see my comment. There's an item that doesn't match the scoping questionnaire."*) pointing at a separate Comments tab; no link to the offending section; resubmission restarts stages. 19 rejected vs 23 approved in the data.
**Direction:** epic #352 (anchored comments, stacked PRs #353–#359) addresses anchoring. Beyond it: request-changes-on-a-section (vs whole-doc reject), and preserving already-approved stages on resubmit when only unrelated sections changed.

### F3. Three save paradigms + phantom dirty state (HIGH, cheap)
"Save all changes" footer (most tabs) vs "Changes are automatically saved" (Signers) vs wizard-local Save ("Edits here are saved with the wizard's Save button"). Entering Commercials fresh shows **"You have unsaved pricing changes"** before any interaction.
**Direction:** one autosave model everywhere with a single visible save-state indicator; fix the pricing dirty-flag init.

### F4. Self-defeating defaults (MEDIUM, trivial)
Salesforce Tenants and Timeline default to **999**; Review & Submit then rejects them ("must be greater than 0 and less than 99"). A brand-new SOW starts with **12 blocking validation items**, several of which the app itself planted.
**Direction:** blank + required beats absurd sentinel values; prefill timeline from segment guidelines where possible.

### F5. Signers & client roles don't match reality (MEDIUM)
The tab auto-opens a modal listing **59 unranked SF contacts** with no search. Client Roles is a freeform empty list — while 6 of 8 real ENT SOWs use the same five stakeholder slots (Executive Sponsor, Project Manager, LeanData Administrator, Owner of Business Requirements, SFDC System Team POC).
**Direction:** searchable/typeahead signer picker that doesn't auto-open; pre-seed the five standard client-role slots (ENT default; available to all).

### F6. Navigation/scope confusion (LOW individually, adds up)
- Dashboard: "TOTAL 52" directly above "My Recent SOWs — No SOWs found" (different scopes, no labeling).
- Auto-title duplicates the account: "OpenAI OpCo, LLC. - Renewal - 2026-10-01 - OpenAI OpCo, LLC."
- Env banner flips between "STAGE" and "INTERNAL TOOL" page-to-page.
- **Delete has no confirmation at all** — one click on the edit page's Delete button immediately destroys the SOW and navigates away (verified on staging). Highest-severity item in this group.
- Brief unstyled "JavaScript Required" noscript flash during page hydration.

### Good bones (keep and extend)
Required-information checklist with SF verification badges; pricing auto-calc from products/units/segment; Review & Submit "Go to section" links; segment surfaced in the form header; per-tab URL anchors.

---

## 4. What real Enterprise SOWs revealed (8-doc mining)

### 4.1 The paper problem (headline)

**4 of 8 ENT deals executed on customer paper** (Dell Services Schedule, Rockwell SPA form, Unum Services Agreement, OpenAI SOW/ISA). For these, the app's whole-document PDF is structurally unusable — LeanData content blocks (objective, scope, out-of-scope, phase tables, assumptions, roles, rate table) get transplanted into the customer's form.
**Implication:** an **"export content blocks"** mode (copy-as-rich-text / DOCX per section) serves these deals better than any template variant. This is likely the single most differentiated ENT feature.

### 4.2 Recurring ENT elements the template lacks (ranked)

| # | Element | Freq | Paper | App gap |
|---|---------|------|-------|---------|
| 1 | **Phased engagement structure** — per-phase scope, hours, gating (Unum week-8 go/no-go; Veeam parallel phases) | 6/8 | Both | App has one fixed 6-phase timeline with hardcoded 12.5/25/25/12.5/12.5/12.5 pricing split; no phase-level scope/fee |
| 2 | **Five-slot named stakeholder table** | 6/8 | Both | Freeform client roles (see F5) |
| 3 | **Not-to-exceed / liability caps** (Unum $49.5k NTE; OpenAI $40k) | 3/8 | Customer | No fee-cap concept; caps imply hours-vs-cap tracking |
| 4 | **Acceptance criteria / deemed acceptance** (Dell 15-day; Unum payment-gated) | 4/8 | Customer | Only a soft 3-day closure sign-off buried in assumptions |
| 5 | **Invoicing mechanics** (Rockwell 45-day forfeiture + PO-on-invoice; Unum weekly timesheets) | 3/8 | Customer | **Payment Terms is a commented-out TODO in `SOWPrintView.tsx`** — every LeanData-paper doc carries "billed monthly, as incurred" |
| 6 | **Appendix A: Change Request Form** | 5/5 LD-paper docs | LD | Missing from app print output entirely |
| 7 | **Rate structures** — discounted-rate column w/ overage at discounted rate (Veeam), negotiated per-role rates (Unum $187.50), hours/week retainer (OpenAI) | 4/8 | Both | Per-role rates + discount exist; no overage-rate clause, no retainer framing, no milestone fee schedule |
| 8 | **Governance artifacts** — weekly status report incl. budget/health, RAID log, steering committee, escalation ladder | 6/8 | Both | Current LD doc template has these; app's hardcoded phases omit PM/Training phases and artifacts |
| 9 | **Non-implementation engagement shapes** — advisory/optimization (ZoomInfo API advisory), staff-aug retainer (OpenAI) | 2/8 | Both | Template hard-assumes net-new implementation |
| 10 | Travel riders, PII questionnaires, open-source warranties, 3–6 SF tenants | scattered | Customer | Tenant flexibility trivial; riders are process (store standard answers), not template |

**[LD]-paper items (template opportunities, fully in our control):** #1, #2, #5-terms-block, #6, #7, #8, #9.
**Customer-paper items (unavoidable; need process support, not templates):** #3, #4, #5-mechanics, #10 — best served by the export mode (§4.1) plus a "canned answers" library (e.g., the Dell PII matrix response).

Also observed: signer identity varies by deal/era (SVP CX, CFO, COO) — validates the editable-signers work that shipped in PR #379.

---

## 5. The segmentation model (proposal)

### 5.1 Two tiers, config-driven

- **ENT** = `LE` + `EE`. **Core** = `MM` + `EC`.
- New `segment_rules` config table + `src/lib/segment-rules.ts` helper (follows the existing admin-config pattern), retiring today's scattered `=== 'EE' || === 'LE'` / `=== 'MM'` literals. Rules keyed per segment code; the two-tier grouping is expressed in the rule values, so a future third tier is config, not code.
- Safe defaults preserved: unknown/missing segment → Core behavior (matches today's "requires approval" fallback).

### 5.2 What segment drives (and what it deliberately doesn't)

| Dimension | Core (MM+EC) | ENT (LE+EE) | Mechanism / cost |
|---|---|---|---|
| Form surface | Baseline tabs; advanced sections hidden (phases, caps, invoicing) | All sections | Tab/section gating via the `restrictedTab` precedent in `SOWForm.tsx:989` — cheap |
| Content templates | Standard set | ENT variant set (phased scope, governance, payment terms) | `segment` column on `sow_content_templates` + creation-time query preference w/ global fallback — moderate, isolated (PDF unaffected; content copies at creation) |
| Client roles | Optional freeform | Pre-seeded 5-slot stakeholder table | Small |
| Approval chain | PS → (PM if hours) → Sr. Leadership (today's chain) | Possibly +1 stage (e.g., legal/deal-desk visibility) — **validate in interviews before building** | Stage row + branch in `approval-workflow-rules.ts`; signatures must learn `account_segment` — moderate |
| Pricing | Standard rates; +5h MM bump moves into config | Same rates; overage-rate clause, NTE cap field | Rates stay global initially; caps touch pricing SSOT (`pricing-summary.ts`) — expensive, defer until interviews confirm |
| PM-hours removal | PMO approval (as today) | Self-serve (as today) | Moves from literals into `segment_rules` |
| Output | PDF as today | PDF **+ content-block export** | New capability, ENT-first but universal |

**Deliberately universal (not segment-branched):** payment-terms block, Appendix A change form, manual-objectives path, save-model unification, signer search. These are fixes for everyone.

**Open modeling question (for interviews):** engagement *shape* (implementation vs advisory vs retainer) correlates with segment but isn't determined by it. Likely a per-SOW "engagement type" selector whose *availability/default* is segment-driven — not a segment branch per se.

---

## 6. Roadmap

Sequenced for value-per-effort and dependency order. Each phase = its own spec → plan → implementation cycle.

### Phase 0 — Quick wins (days; no design debt)
- **Add a delete confirmation** (F6 — currently one-click destructive, no undo); kill 999 defaults (F4); fix phantom pricing dirty-flag (F3); dedupe auto-title (F6); signer-picker search + stop auto-opening (F5); clarify dashboard list scoping (F6).

### Phase 1 — Segment substrate (small)
- `segment_rules` table + admin page + `src/lib/segment-rules.ts`; migrate the two existing literal behaviors (PM-removal self-serve, MM +5h) into it. Pure refactor, no behavior change — de-risks everything after.

### Phase 2 — Form simplification (medium)
- Invert the objectives wizard (F1): manual-first editor, AI generation as an inline opt-in accelerator.
- Unify save model across tabs (F3).
- Pre-seeded 5-slot client-role table (F5 / mining #2).

### Phase 3 — Template & content ENT-readiness (medium)
- Payment Terms block (un-TODO it) + Appendix A Change Request Form — universal.
- Per-segment template variants (`sow_content_templates.segment`): ENT set adds phased-scope skeleton, governance/status-report language, invoicing block.
- Tab/section gating from `segment_rules` (Core hides ENT-only sections).

### Phase 4 — ENT structures (larger; **gate on interview validation**)
- Phased engagement model: per-phase scope/hours/fees replacing the hardcoded 6-phase pricing split (mining #1 — biggest structural gap).
- NTE cap field + overage-rate clause (mining #3, #7).
- Engagement-type selector (implementation / advisory / retainer) with template consequences (mining #9).
- Segment-conditional approval stage if interviews confirm the need.

### Phase 5 — Customer-paper support (differentiated ENT value)
- Content-block export mode: per-section copy-as-rich-text / DOCX export for transplanting into customer procurement forms (§4.1).
- Canned-answers library for recurring procurement asks (PII matrix, travel policy pointers).

### Parallel track — Validation interviews
Run after this doc circulates, before Phase 4 commitments. Interview ENT PS lead + delivery managers. The mined catalog (§4.2) is the hypothesis list; per item ask: *how often, who owns the language today, what breaks if we standardize it?* Also validate: extra ENT approval stage (real need or imagined?), engagement-type taxonomy, and whether Core deals can lose any currently-required fields.

### Dependencies & notes
- Phase 1 before 3/4 (rules substrate). Phase 0/2 independent — can interleave with the ongoing P1-issue-fixing session.
- Epic #352 (anchored comments) proceeds independently and carries most of F2; section-scoped re-approval is a candidate Phase 4+ follow-on.
- Pricing-SSOT changes (caps) deliberately deferred to Phase 4 — signature ripple through `getPricingSummary()` callers/tests is the most expensive wiring in the codebase per the readiness analysis.

---

## 7. Open questions

1. Does ENT need an *added* approval stage, or just different visibility (e.g., deal-desk notification)? — interviews.
2. Engagement-type taxonomy: is implementation / advisory / retainer the right cut? — interviews.
3. Should Core deals get a *reduced required-field set* (faster submit), and which fields? — interviews + rejection-reason analysis.
4. Export format for content blocks: DOCX per section, one DOCX of all sections, rich-text clipboard, or all three?
5. Where do canned procurement answers live — admin config or a Drive folder the app links?

## 8. Appendix: source evidence

- **Walkthrough:** staging (`sow-generator-staging.up.railway.app`), 2026-07-04, OpenAI OpCo renewal opportunity (test draft created for the walkthrough and deleted afterward — which is how the no-confirmation delete was discovered).
- **Mined docs (Drive):** Dell Partner Channel Leads (Dell paper) · Rockwell Orchestration (Rockwell SPA) · Veeam Buying Groups 2024 (LD paper) · CDW Orchestration 2026 phased (LD paper) · ZoomInfo BookIt 1Mind (LD paper) · Unum WSS25035 (Unum paper) · OpenAI Orchestration Sept 2025 (OpenAI paper) · RL Polk fully executed Dec 2025 (LD paper).
- **Key code refs:** `SOWForm.tsx:977-994` (tab array), `approval-workflow-rules.ts` (hardcoded stage logic), `pricing-summary.ts:63-70` (SSOT + discount clamp), `hours-calculation-utils.ts:128` (MM bump), `PricingRolesAndDiscount.tsx:145` (ENT literal), `salesforce.ts:348-376` (segment derivation), `sow/route.ts:34-54` (template copy at creation), `SOWPrintView.tsx` (Payment Terms TODO).
