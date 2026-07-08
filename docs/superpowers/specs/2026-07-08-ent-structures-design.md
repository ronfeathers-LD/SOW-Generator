# ENT Structures (Roadmap Phase 4, questionnaire-validated) — Design

**Date:** 2026-07-08
**Status:** Approved design, pre-implementation
**Parents:** `2026-07-04-ent-readiness-and-simplification-assessment.md` §6 Phase 4; questionnaire responses (Erin Barrett, Michael Klein, Ryan/PM — 3 of 4 in, Bridgette pending; ~135 ENT SOWs/yr combined)

## Evidence base & scope decisions

Unanimous top pain (3/3): **AI-generated scope in the LeanData house voice, organized by the Solution Value Framework (SVF)**. Confirmed MUSTs: phased engagements (scope/dates/visual — explicitly NO per-phase fees, 3/3), rate structures (shape: discounted initial rate, change-order/overage at STANDARD rate, never blended-vs-per-role mixing). Lean MUST: engagement types (Expert Services) — deferred, see Non-goals.

**Formally retired** (questionnaire evidence): NTE caps (0/10 frequency ×2, "post-paid, unnecessary"); extra ENT approval stage (Michael: "Approval steps are typically the reason things go sideways… the fewer steps the better"); governance sections ("almost never"); invoicing sections (AE/Finance-owned); **customer-paper export — the former Phase 5** (Michael: "I wouldn't waste too much time building this — it's easy to copy the relevant data directly from the SOW").

Build order: **P4d punch-list → P4c commercial verbiage → P4a SVF/house-voice → P4b phased visual.** Each sub-scope gets its own implementation plan; they are independent.

Decisions from design review: SVF = the 4-pillar framework (**Acquire / Adopt / Retain / Expand**); house-voice exemplar corpus = the mined LeanData-paper SOWs (Veeam, CDW, ZoomInfo, RL Polk); order as above.

---

## P4d — Punch-list (Ryan §6a)

### d1. Product groups from the categories table
**Today:** `ProjectOverviewTab.tsx:192-215` hardcodes exactly three buckets (`FlowBuilder`/`BookIt`/`Other` literals filtering `product.category`); a product in any other category silently never renders. Products and product_categories are already DB tables with admin CRUD.
**Design:** render product groups from the `product_categories` table (ordered), each group filtering products by its category; the three known categories keep their bespoke unit-field wiring (`orchestration_units`, `bookit_*_units`, `other_products_units`); any OTHER category uses the generic `other_products_units` path. Admin can then add "Integrations" (category + products) with zero further code. Group headers/icons: reuse the existing style; icon optional per category (text-only for new ones is fine).

### d2. Standard client roles +2
Add to `STANDARD_CLIENT_ROLES` (src/lib/sow/standard-client-roles.ts), after the existing five: **MAP Administrator** ("Administers the marketing automation platform; owns form/webhook changes needed for scheduling flows.") and **Web Developer** ("Implements website-side changes (forms, scripts, routing snippets) required for scheduling deployments."). Seeded on new SOWs; removable as always; `mergeStandardClientRoles` picks them up for existing SOWs via the Add-standard-roles button.

### d3. SFDC tenant names
New nullable column `sows.salesforce_tenant_names TEXT` (free text, e.g. "Prod; UAT sandbox 'uat2'; Dev"). Input in ProjectOverviewTab directly below the tenant count (label "Tenant Names", helper "Name each tenant/sandbox in scope"); flows through tab payload/column mapping/PATCH allowlist/mapper passthrough exactly like `payment_terms` did (that PR is the template). Rendered beneath the tenant count line in SOWObjectivesPage, SOWFullView, and the PDF (`Salesforce Tenants: 3 — Prod; UAT 'uat2'; Dev` or a second line). Count field and its <99 validation unchanged.

### d4. Confirmations (no code)
Empty client-role rows already render on print/PDF (name → 'N/A'); Appendix A (Ryan's "CO template at end of SOW") already shipped in P3. The plan records both as verify-only items.

## P4c — Commercial verbiage

### c1. Overage at the Standard rate
The existing T&M paragraph (present after the pricing table in SOWPrintView:321-322, SOWFullView:766-767, pdf-generator:1440-1443) ends "Additional hours will be billed at the Rate/Hr." Change to **"Additional hours will be billed at the Standard Rate/Hr."** in all three, matching Erin ("standard rate/hour we have listed"), Ryan ("CO/Overage billed at standard"), and the discounted-initial/standard-overage shape. No pricing-model changes needed — `defaultRate` (standard) vs `ratePerHour` (discounted) already exist and display.

### c2. Payment terms block
- `DEFAULT_PAYMENT_TERMS` becomes: **"Billed monthly, as incurred. Monthly fees shall be due upon receipt and sent to the following Customer contact:"** (Ryan's language).
- Render order inside the Billing Information block changes so Payment Terms appears FIRST, followed by Company Name / Billing Contact / Address / Email / PO Number (so "the following Customer contact" reads correctly). All three surfaces.
- Existing SOWs keep their stored `payment_terms` value (the old default reads fine in either position). No data migration.

## P4a — SVF + house-voice scope generation

### a1. Contract extension (code)
`analyzeTranscription` (src/lib/gemini.ts:328-393) — the hardcoded JSON contract gains SVF structure:
```
{ customerName, objectiveOverview,
  overcomingActions: string[],
  scopeItems: { pillar: 'Acquire'|'Adopt'|'Retain'|'Expand', items: string[] }[],   // NEW: in-scope use cases per pillar
  solutions: { pillar: ..., products: Record<productName, string[]> }[]             // RESHAPED: deliverables nested pillar → product
  , isFallback }
```
Back-compat: the client accepts the old flat `solutions` shape (isFallback / older prompt outputs) and renders it as today. The four pillar names are a hardcoded constant (`SVF_PILLARS`) with a one-line definition each (from the SVF playbook: Acquire = winning new revenue; Adopt = driving product usage/onboarding; Retain = protecting renewals; Expand = growing existing accounts) embedded in the prompt's system portion so the model classifies correctly.

### a2. Output landing (code)
- `deliverablesHtml`: `<h3>` per pillar (only pillars with content), `<h4>`/bold per product beneath, `<ul>` items — replacing the flat product-keyed grouping.
- **NEW: scope generation** — `scopeItems` renders to HTML (pillar-headed lists) and lands in `custom_scope_content` (+ `ai_generated_scope_content`, `scope_content_edited: false`) through the same fan-out pattern as the other three fields (extend `aiGenerationPatch` in objectives-content.ts + the modal's success shaping). The Scope section is editable in the Content tab as today; PDF/print render unchanged (they already read `custom_scope_content`).
- The AI panel's success flow gains a note in the collapsed summary: "Generated: overview, objectives, deliverables, scope."

### a3. House voice (content, admin-editable)
The active `ai_prompts` row's `prompt_content` (DB-driven, versioned, admin-editable at /admin/ai-prompts) is rewritten to include: (1) voice rules — write as LeanData PS ("LeanData will…", active voice, no AI-tells like "leverage/robust/seamless", concrete SF object names over abstractions); (2) 2-3 short exemplar passages excerpted from the mined LD-paper SOWs (Veeam buying-groups scope, CDW GTM-phased scope, RL Polk SLA scope); (3) SVF pillar definitions and classification guidance. Because this is data not code, PS can tune voice without deploys — the implementation plan seeds the new prompt content as a new VERSION of the active prompt (revertable), and the exact prompt text ships in the repo under docs/ for review.
**Acceptance bar:** generation on the Aera staging fixture produces scope/deliverables organized under correct pillars, in house voice — verified by eyeball against the exemplars, and by Ron/PS on staging before promote.

## P4b — Phased scope + visual

### b1. Data model
New `sows.project_phases JSONB` — `[{ name: string, description: string, startWeek: number, durationWeeks: number }]`. At creation, defaulted from `timeline_weeks` × today's hardcoded six-phase split (Engage 12.5% → Hypercare 12.5%, same names/descriptions as the current table literals — extracted to a shared constant `DEFAULT_PROJECT_PHASES(timelineWeeks)`). Editing `timeline_weeks` later does NOT silently rescale customized phases; the UI offers a "Reset phases from timeline" action.

### b2. Editing
Project Overview tab gains a "Project Phases" card under the timeline field: rows of name/description/start/duration with add/remove/reorder; flows through the standard payload/mapping path; autosaved. NO fee/hours fields (unanimous). Validation: warn (not block) when phases exceed `timeline_weeks`.

### b3. Phase visual
The three duplicated timeline `<table>`s (SOWPrintView:254-278, SOWFullView:699-709, pdf-generator:1252-1266) are replaced by a shared horizontal phase-bar visual: a week-axis strip with one labeled block per phase (position = startWeek, width = durationWeeks), descriptions listed compactly beneath. Pure CSS/HTML (no JS/canvas) so Puppeteer renders it; grayscale-safe; one React component shared by the two views + a mirrored HTML-string block in pdf-generator (its established pattern). Overlapping/parallel phases (Veeam pattern) render as stacked rows.

## Non-goals

Engagement types / Expert Services SOW variant (lean-MUST but needs its own discovery — what does an ES SOW even contain; revisit after Bridgette's response); per-phase fees/hours (explicitly rejected 3/3); caps, extra approval stage, governance sections, invoicing sections, customer-paper export (all retired above); changes to the 6-phase default split percentages.

## Verification (staging, per sub-scope)

- P4d: admin-create "Integrations" category + product → renders as a fourth group and is selectable; new SOW seeds 7 roles; tenant names round-trip to print/PDF.
- P4c: print/full/PDF show "Standard Rate/Hr"; new SOW's billing block leads with the new payment-terms line followed by contact fields.
- P4a: Aera fixture generation → pillar-organized scope + deliverables in house voice; scope lands editable in Content tab; old-shape responses still render (back-compat path).
- P4b: new SOW gets 6 default phases; edit/add/remove phases → visual updates in all three outputs; PDF paginates cleanly.

## Test surface

Pure/unit: DEFAULT_PROJECT_PHASES generator; phase-visual layout math (position/width from weeks) if extracted; SVF response parsing/back-compat mapping; aiGenerationPatch extension for scope; tenant-names mapper passthrough; product-group derivation from categories.
