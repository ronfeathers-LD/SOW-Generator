# Form Simplification Implementation Plan (ENT Roadmap Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invert the objectives wizard to a manual-first editor with opt-in AI, unify the form on one debounced autosave, and seed the five standard client-role slots.

**Architecture:** Three workstreams built lib-first: pure content fan-out + client-roles helpers (tested), then the `ObjectivesEditor` component replacing `ObjectivesWizard` at SOWForm's mount point, an AI-sources panel rehosting the existing step components, a single debounced autosave loop in SOWForm reusing `handleSaveAll`, and a deletion sweep of the dead/absorbed wizard files.

**Tech Stack:** Next.js 15 App Router, TypeScript, TipTap, Vitest (`npm test`), Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-05-form-simplification-design.md` — read it first; its "What exists" sections carry the scouted file/line map.

## Global Constraints

- **Field contract (load-bearing):** PDF, print views, and `validation-utils.ts:56-81` read `custom_objective_overview_content`, `custom_key_objectives_content`, `custom_deliverables_content` (with legacy fallbacks `objectives.description`, `objectives.key_objectives[]`, `scope.deliverables`). Every objectives write path must keep populating these exactly; `pdf-generator.ts` hard-errors if `custom_key_objectives_content` is empty.
- **`*_edited` semantics (new, deliberate):** manual editor changes → `{field}_edited: true`; AI generation → writes `custom_*` + `ai_generated_*` and `{field}_edited: false`.
- `tab-payloads.ts` and the `bulk-update`/`tab-update` API routes are UNTOUCHED — payload shapes don't change.
- Tests: Vitest, co-located `src/**/*.test.ts` (never `__tests__/`). Gates per task: `npm test` fully green + `npm run build`. `npm run lint` fails pre-existing in worktrees — ignore that specific failure.
- Branch `feat/form-simplification` in an isolated worktree; main checkout belongs to another session. Check `gh pr list` for overlap before starting.
- Match surrounding Tailwind idiom; the app supports dark mode (`dark:` classes) — new UI must too.
- Staging verify only at the end — no prod promote in this phase.

---

### Task 1: Objectives content fan-out lib

**Files:**
- Create: `src/lib/sow/objectives-content.ts`
- Create: `src/lib/sow/objectives-content.test.ts`

**Interfaces:**
- Produces:
  - `interface GeneratedObjectives { overview: string; keyObjectivesHtml: string; deliverablesHtml: string; keyObjectives: string[]; deliverables: string[] }`
  - `manualEditPatch(field: 'overview' | 'keyObjectives' | 'deliverables', html: string): Record<string, unknown>` — returns the formData patch for a manual editor change: sets the matching `custom_*_content` to `html`, sets the matching `*_edited` flag `true`, and mirrors legacy fields (`overview` → also `objectives.description` handled by the CALLER since it needs prev state — see note below).
  - `aiGenerationPatch(gen: GeneratedObjectives): Record<string, unknown>` — the full fan-out for an AI result: all three `custom_*_content`, all three `ai_generated_*_content`, all three `*_edited: false`, plus `deliverables: gen.deliverables.join('\n')`.
- Note: legacy mirrors that need previous state (`objectives: { ...prev.objectives, description, key_objectives }`) are composed by the component (Task 3) around these patches; the lib returns only the stateless portion. Document this in the lib's JSDoc.

Field-name mapping (exact):
| field | custom | ai | edited |
|---|---|---|---|
| overview | `custom_objective_overview_content` | `ai_generated_objective_overview_content` | `objective_overview_content_edited` |
| keyObjectives | `custom_key_objectives_content` | `ai_generated_key_objectives_content` | `key_objectives_content_edited` |
| deliverables | `custom_deliverables_content` | `ai_generated_deliverables_content` | `deliverables_content_edited` |

- [ ] **Step 1: Write failing tests** — cases: manual patch per field (correct custom field, `edited: true`, does NOT touch `ai_generated_*`); AI patch (all nine fields + `deliverables` join; `edited: false` on all three).

```ts
// src/lib/sow/objectives-content.test.ts (representative — cover all three fields)
import { describe, expect, it } from 'vitest';
import { aiGenerationPatch, manualEditPatch } from './objectives-content';

describe('manualEditPatch', () => {
  it('sets the custom field and marks it edited', () => {
    const patch = manualEditPatch('keyObjectives', '<ul><li>KO</li></ul>');
    expect(patch.custom_key_objectives_content).toBe('<ul><li>KO</li></ul>');
    expect(patch.key_objectives_content_edited).toBe(true);
    expect(patch).not.toHaveProperty('ai_generated_key_objectives_content');
  });
});

describe('aiGenerationPatch', () => {
  it('writes custom + ai fields and resets edited flags', () => {
    const patch = aiGenerationPatch({
      overview: 'O', keyObjectivesHtml: '<p>K</p>', deliverablesHtml: '<p>D</p>',
      keyObjectives: ['k1'], deliverables: ['d1', 'd2'],
    });
    expect(patch.custom_objective_overview_content).toBe('O');
    expect(patch.ai_generated_deliverables_content).toBe('<p>D</p>');
    expect(patch.objective_overview_content_edited).toBe(false);
    expect(patch.deliverables).toBe('d1\nd2');
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/lib/sow/objectives-content.test.ts` → module not found.
- [ ] **Step 3: Implement** (simple record-building functions per the mapping table; keep them pure, no imports beyond types).
- [ ] **Step 4: Run to pass**, then `npm test` fully green.
- [ ] **Step 5: Commit** — `feat(objectives): pure content fan-out lib with corrected edited-flag semantics`

---

### Task 2: Standard client roles lib + seeding

**Files:**
- Create: `src/lib/sow/standard-client-roles.ts`
- Create: `src/lib/sow/standard-client-roles.test.ts`
- Modify: `src/app/api/sow/route.ts` (POST handler — seed on create)

**Interfaces:**
- Produces:
  - `STANDARD_CLIENT_ROLES: ClientRole[]` — the five slots, in this order, `name`/`email` empty, `responsibilities` filled with concise canned text (adapt the quick-fill strings in `TeamRolesTab.tsx:1097-1170` where a matching role exists; write sensible one-sentence text for the rest): `Executive Sponsor`, `Project Manager`, `LeanData Administrator`, `Owner of Business Requirements`, `SFDC System Team Point of Contact`.
  - `mergeStandardClientRoles(existing: ClientRole[]): ClientRole[]` — returns `existing` + whichever standard slots are missing (matched case-insensitively on trimmed `role`); never removes or reorders existing entries; returns the SAME array reference if nothing to add (callers use that to no-op).
- Consumes: `ClientRole` from `src/types/sow.ts:11-18`.

- [ ] **Step 1: Failing tests** — `mergeStandardClientRoles([])` returns all 5 in order; merge with 2 existing (one matching a standard slot case-insensitively) adds only the missing 4; same-reference return when all 5 present; existing entries untouched.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement lib.**
- [ ] **Step 4: Seed at creation** — in `src/app/api/sow/route.ts` POST handler, where the sow row's `client_roles` (inside the roles JSON) is initialized (read the handler; it builds the insert payload around lines 55-120), default empty client_roles to `STANDARD_CLIENT_ROLES`. Only when the incoming payload has no client roles — never overwrite provided ones.
- [ ] **Step 5: Run to pass** + `npm test` + `npm run build`.
- [ ] **Step 6: Commit** — `feat(roles): seed five standard client-role slots on SOW creation`

---

### Task 3: ObjectivesEditor component (manual-first)

**Files:**
- Create: `src/components/sow/ObjectivesEditor.tsx`
- Modify: `src/components/SOWForm.tsx` (mount point ~1362-1370; delete `objectivesNav` plumbing at :339, :1368, :1466-1489 — locate by content)

**Interfaces:**
- Consumes: `manualEditPatch`, `aiGenerationPatch`, `GeneratedObjectives` (Task 1). TipTap editor: reuse the same `TipTapEditor` component `FinalEditStep.tsx:416-460` uses (read it for exact import + props).
- Produces: `<ObjectivesEditor formData setFormData selectedAccount selectedOpportunity />` — prop shape mirrors what SOWForm passes ObjectivesWizard today (read the mount site; keep the same props minus `onNavChange`). Exposes a stable slot `{aiPanel}` region at the top for Task 4 (render placeholder `<div id="ai-generation-panel" />` comment marker or accept an optional `renderAiPanel` — implementer's choice, documented in the report).

**Structure to build:**
- Three labeled sections (Objective Overview / Key Objectives / Deliverables), each a TipTapEditor initialized from `formData.template?.custom_*_content ?? ''` (check how FinalEditStep sources initial values — mirror it, including any legacy fallback reads).
- onChange per editor: compose `manualEditPatch(field, html)` + legacy mirrors (overview also updates `objectives.description`; keyObjectives also `objectives.key_objectives` if FinalEditStep did) into ONE `setFormData` call.
- Placeholder/empty-state copy: "Write objectives here, or use Generate with AI above."
- No internal save timer — the global autosave (Task 5) owns persistence. Until Task 5 lands, changes persist via the existing footer save/tab-switch save; note this in the report.
- Delete the `ObjectivesStepNav` type import/usage from SOWForm (`objectivesNav` state, `objNav` footer override); footer falls back to plain section nav. Do NOT delete wizard files yet (Task 6).

- [ ] **Step 1: Build component** per structure.
- [ ] **Step 2: Swap the mount** — SOWForm renders `<ObjectivesEditor …/>` where `<ObjectivesWizard …/>` was.
- [ ] **Step 3: Gates** — `npm test` + `npm run build`. Manual dev-server sanity is Task 7's job.
- [ ] **Step 4: Commit** — `feat(objectives): manual-first ObjectivesEditor replaces wizard mount`

---

### Task 4: AI generation panel

**Files:**
- Create: `src/components/sow/objectives-wizard/AiGenerationPanel.tsx` (new home; directory will be renamed conceptually by deletion task — fine to create here)
- Modify: `src/components/sow/ObjectivesEditor.tsx` (host the panel)

**Interfaces:**
- Consumes: `DocumentSelectionStep`, `AvomaSelectionStep` (rehosted — read their prop contracts: they take `wizardData, updateWizardData, formData, setFormData, selectedAccount, selectedOpportunity, onNext, onPrev…`; pass no-op nav handlers), `AIGenerationModal` (read its props: sources + callbacks incl. `onSuccess(generated)`), `aiGenerationPatch` (Task 1).
- Produces: `<AiGenerationPanel formData setFormData selectedAccount selectedOpportunity onGenerated(gen: GeneratedObjectives) />`.

**Structure:**
- Collapsed by default: a button-row "✨ Generate with AI — analyze call transcripts and documents" with chevron. Expanding shows: Documents section (DocumentSelectionStep), Avoma section (AvomaSelectionStep), a "Combined content preview" accordion (textarea bound to the same `preview_content`/wizardData field ContentPreviewStep used — read ContentPreviewStep for the field and its regenerate logic; a simplified single textarea + "Rebuild from sources" button is enough), and a primary **Generate objectives** button that opens `AIGenerationModal`.
- The panel maintains the minimal `wizardData` slice those steps need (`useState` seeded from `formData.selected_documents`/`selected_meetings` — read how ObjectivesWizard builds initial wizardData at its `useState` and reproduce only what the two steps + modal consume).
- Modal `onSuccess` → `onGenerated(generated)` → ObjectivesEditor applies `aiGenerationPatch` + legacy mirrors in one `setFormData`, collapses the panel, and the editors re-render with the generated HTML (verify TipTap editors take value updates — FinalEditStep managed this; mirror its approach).
- Generate button disabled with helper text when no sources AND no preview content (mirrors today's "No content to analyze" state).

- [ ] **Step 1: Build panel; Step 2: host in ObjectivesEditor; Step 3: gates (`npm test` + `npm run build`); Step 4: Commit** — `feat(objectives): opt-in AI generation panel replaces wizard steps`

---

### Task 5: Global autosave

**Files:**
- Modify: `src/components/SOWForm.tsx` (autosave effect + footer)

**Interfaces:**
- Consumes: existing `handleSaveAll`, `hasUnsavedChanges`, `isSaving`, `lastSavedAt`, `updateFormData(markDirty)` (from the P1/P0 work).

**Behavior (exact):**
- New effect: when `hasUnsavedChanges` becomes true, start/restart a 1500ms timer → on fire, if a save is already in flight set a `pendingSaveRef` and re-run when it completes; else call `handleSaveAll()`. Skip entirely when `!initialData?.id`. Clear timer on unmount. (Existing tab-switch flush-save and `beforeunload` guard stay — read `handleTabChange` ~:285-300 and the beforeunload effect ~:553-563 and leave them.)
- Footer (~:1453-1556): remove the "Save all changes" button (and its restricted-mode variants); keep Back/Next and the save-status indicator; indicator states unchanged (`Saving… / Unsaved changes / Saved at {time} / All changes saved`) — with autosave, "Unsaved changes" now only shows during the debounce window.
- Correct stale copy: grep `src/components` for "when you click the save button" / "Save all changes" strings in helper text (e.g. the Customer Information notice seen in the assessment) and update to "Changes are saved automatically."

- [ ] **Step 1: Implement effect + footer change; Step 2: stale-copy sweep; Step 3: gates; Step 4: Commit** — `feat(form): single debounced autosave replaces Save-all button`

---

### Task 6: Consolidation + deletions

**Files:**
- Modify: `src/components/sow/TeamRolesTab.tsx` (remove local save calls)
- Delete: `src/components/sow/ObjectivesTab.tsx`, `src/components/sow/ObjectivesWizard.tsx`, `src/components/sow/objectives-wizard/AIGenerationStep.tsx`, `src/components/sow/objectives-wizard/FinalEditStep.tsx`, `src/components/sow/objectives-wizard/ContentPreviewStep.tsx`
- Modify: `src/components/sow/TeamRolesTab.tsx` — "Add standard roles" button (uses Task 2's `mergeStandardClientRoles`)

**Steps:**
- [ ] **Step 1: TeamRolesTab** — remove `saveClientRoles`/`saveClientRolesWithRoles` per-field `tab-update` PUTs and the 1.5s responsibilities timer; every mutation goes through `setFormData` (marking dirty → global autosave). Replace the "Changes are automatically saved" chip with nothing (the global footer indicator covers it). KEEP the immediate save for LeanData-signatory changes ONLY if it lives in SOWForm (read `handleLeanDataSignatoryChange` ~:629 — if it PUTs directly, route it through setFormData+autosave instead for consistency).
- [ ] **Step 2: Add standard roles button** — in the client-roles section header: `const merged = mergeStandardClientRoles(clientRoles); if (merged !== clientRoles) setFormData(...)`; button hidden when all five present.
- [ ] **Step 3: Delete the five files**; `git grep -n "ObjectivesWizard\|ObjectivesTab\|FinalEditStep\|AIGenerationStep\|ContentPreviewStep" src/` must return only `AiGenerationPanel`'s own imports of surviving components (fix any stragglers — e.g. the stale comment in `src/lib/sow-content.ts:79`).
- [ ] **Step 4: Gates** — `npm test` + `npm run build` (build catches dangling imports).
- [ ] **Step 5: Commit** — `refactor(objectives): delete wizard chrome and dead ObjectivesTab; unify signers saves`

---

### Task 7: Final review + staging verification

- [ ] Full gates: `npm test && npm run build`.
- [ ] Whole-branch review (subagent-driven flow's final reviewer) with the spec's Verification section as the checklist.
- [ ] Push `feat/form-simplification`, open PR referencing the spec; PR body lists the staging verification script (spec §Verification) and notes NO prod promote — staging soak per Ron.
- [ ] After merge + staging deploy: browser-verify on staging per spec §Verification (objectives editing, AI panel end-to-end with a real account, autosave persistence across reload, seeded roles on a new SOW, PDF render, Review & Submit validation parity).
