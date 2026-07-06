# ENT Validation Interview Guide

**Purpose:** Validate the Phase 4/5 hypotheses from the ENT-readiness assessment before building the expensive parts. Sources: 8 mined Enterprise SOWs (Dell, Rockwell, Veeam, CDW, ZoomInfo, Unum, OpenAI, RL Polk) + the assessment's open questions.
**Who to interview:** ENT PS lead, 1-2 delivery managers who've run ENT engagements, ideally someone who's survived a customer-paper deal (Dell/Rockwell/Unum class).
**Format:** ~45 min each. The hypothesis table is the spine; the open questions close each session. Capture answers inline — this doc becomes the Phase 4 spec input.

## How to use the hypothesis table

Each row is something the mined SOWs suggest ENT deals need. For each, ask the three calibration questions:
1. **Frequency** — how many of your last ~10 ENT deals needed this?
2. **Ownership** — who writes/negotiates this language today, and where does it live?
3. **Standardization cost** — if the tool generated a standard version, what breaks? Who'd push back?

Score each: `MUST` (build in P4) / `NICE` (backlog) / `SKIP` (customer-paper-only, handle via export).

## Hypothesis table (from the 8-SOW mining, ranked by observed frequency)

| # | Hypothesis | Seen in | Score | Notes |
|---|---|---|---|---|
| 1 | **Phased engagements** — per-phase scope, hours, fees, and gating (go/no-go checkpoints) instead of the fixed 6-phase timeline with hardcoded percentage splits | 6/8 (Veeam parallel phases; Unum week-8 gate; CDW 2-phase GTM) | | Biggest structural change. Probe: do phases need separate *fees*, or just separate scope/timeline? |
| 2 | **Named stakeholder slots** — the 5-role customer table (Exec Sponsor, PM, LD Admin, Business Requirements Owner, SFDC POC) | 6/8 | *(shipped in P2 — validate the role names/responsibilities text)* | Are our 5 the right 5? Right canned responsibilities? |
| 3 | **Not-to-exceed / liability caps** — a cap field with the obligation not to invoice beyond it without a change order | 3/8 (Unum $49.5k NTE, OpenAI $40k, Dell form option) | | Probe: do WE ever offer caps proactively on LD paper, or only under customer duress? If only duress → SKIP (export handles it). |
| 4 | **Acceptance criteria / deemed-acceptance windows** | 4/8 (Dell 15-day, Unum payment-gated) | | Formalize the existing 3-day closure sign-off into an optional section? |
| 5 | **Invoicing mechanics** — PO-on-invoice, timesheets, monthly detail requirements | 3/8 | | Mostly customer-paper. Probe: does Finance want any of this standard on LD paper? |
| 6 | **Rate structures beyond one blended rate** — standard+discounted columns with "overage billed at discounted rate" (Veeam), per-role negotiated rates (Unum), hours/week retainer (OpenAI) | 4/8 | | Which of the three shapes recurs? Retainers especially: is OpenAI a one-off or a growing motion? |
| 7 | **Engagement types** — implementation vs. optimization/advisory (ZoomInfo API advisory) vs. staff-aug retainer (OpenAI) | 2/8 but strategically loud | | Is impl/advisory/retainer the right taxonomy? What % of ENT pipeline is non-implementation? |
| 8 | **Extra ENT approval stage** — does ENT need an added approver (legal/deal-desk), or just visibility (notification)? | assessment open question | | The tool can do either cheaply. Probe for a real incident where a missing approval hurt. |
| 9 | **Governance artifacts** — steering committee, escalation ladder, comms plan sections | 6/8 have some | | Template content (Phase 3 variants can carry it) vs. new structure? |
| 10 | **Multi-tenant scale** — 3-6 SF tenants routinely | 3/8 | *(validation caps tenants at <99 — fine)* | Any friction left here? |

## Customer-paper reality check (Phase 5)

4 of the 8 mined deals were executed on the CUSTOMER's form — the app's PDF is unusable there; people transplant content blocks by hand.

- How do you get our content into their form today? (copy-paste from where? retype?)
- If the tool offered per-section export, what format actually helps: **DOCX per section / one DOCX of everything / rich-text clipboard copy**? (Assessment open question #4 — this decides the P5 build.)
- What recurring procurement asks should have canned answers on file? (Dell's PII questionnaire, travel policies, InfoSec riders — where do the answers live today?)

## Closing questions (each interview)

1. What did the recent tooling changes get wrong for ENT? (seeded roles, payment terms default, appendix form — react to what's now live)
2. What's the ONE thing that costs you the most hours per ENT SOW that we haven't discussed?
3. Could Core/MidMarket SOWs drop any currently-required fields? (Segmentation cuts both ways — assessment open question #3.)
4. Who else must I talk to before we build the ENT structures?

## After the interviews

Fill the Score column, attach notes per row, drop the doc back to me/Claude — it becomes the input for the Phase 4 design spec (same brainstorm → spec → plan → build pipeline as Phases 0-3).
