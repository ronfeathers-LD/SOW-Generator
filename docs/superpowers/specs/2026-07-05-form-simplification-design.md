# SOW Form Simplification (ENT Roadmap Phase 2) — Design

**Date:** 2026-07-05
**Status:** Approved design, pre-implementation
**Parent:** `2026-07-04-ent-readiness-and-simplification-assessment.md` §6 Phase 2 (findings F1, F3, F5)

## Decisions (made in design review)

- **Objectives: full inversion.** The tab opens directly on editable objectives editors; AI generation is an opt-in panel, not a 5-step corridor. The wizard chrome goes away.
- **Autosave everywhere.** One debounced autosave for the whole form + one visible save-state indicator; the "Save all changes" button goes away. (Objectives and Signers already autosave via `tab-update`; this unifies the remaining five tabs and consolidates the three existing paradigms into one.)
- **Client roles: seed the five standard slots** (from the ENT SOW mining: 6 of 8 real SOWs use the same stakeholder table).

## A. Objectives — manual-first editor

### What exists (scouted from origin/main)
- `SOWForm.tsx:1362-1370` mounts `ObjectivesWizard` (5 steps: documents → avoma → preview → generate → final). `ObjectivesTab.tsx` (63KB) is **dead code** — mounted nowhere.
- `FinalEditStep` already contains the three TipTap editors (Objective Overview / Key Objectives / Deliverables) writing `custom_objective_overview_content`, `custom_key_objectives_content`, `custom_deliverables_content` (+ `ai_generated_*` + `*_edited` flags + legacy `objectives`/`deliverables` mirrors) via `ObjectivesWizard.updateWizardData`.
- The wizard autosaves: 1s-debounced `PUT /api/sow/{id}/tab-update` with `tab: 'Objectives'`.
- **Load-bearing constraint:** PDF (`pdf-generator.ts` — hard-errors if `custom_key_objectives_content` empty), print views, and validation (`validation-utils.ts:56-81`) all read the `custom_*_content` fields with legacy fallbacks. The new UI must keep writing exactly these fields.

### New shape
1. **`ObjectivesEditor.tsx`** (new; replaces `ObjectivesWizard` at the SOWForm mount point): renders the three TipTap editors directly — FinalEditStep promoted to the whole tab. Field-write fan-out (custom/ai/edited/legacy mirrors) moves here, with corrected `*_edited` semantics: **manual typing sets `*_edited: true`; AI generation sets `*_edited: false`** (today every write resets to false, defeating the edit-detection flags).
2. **"Generate with AI" panel**: a collapsed panel at the top of the editor ("✨ Generate with AI — analyze call transcripts and documents"). Expanding reveals source selection — the existing `DocumentSelectionStep` and `AvomaSelectionStep` components rehosted side-by-side/stacked (they already take self-contained props), a combined-content preview accordion (ContentPreviewStep's textarea, simplified), and a **Generate** button that opens the existing `AIGenerationModal` unchanged. On success, generated content streams into the three editors (same `generatedObjectives` fan-out). Panel state is local; selected docs/meetings persist to `selected_documents`/`selected_meetings` as today.
3. **Navigation simplification**: the `ObjectivesStepNav` footer-intent plumbing (`setNav`/`onNavChange`/`objectivesNav` in SOWForm) is deleted — the footer returns to plain section navigation on Objectives.
4. **Deletions**: `ObjectivesTab.tsx` (dead), `ObjectivesWizard.tsx`, `AIGenerationStep.tsx`, `FinalEditStep.tsx` (absorbed), the wizard stepper header. `DocumentSelectionStep`/`AvomaSelectionStep`/`AIGenerationModal` survive rehosted; `ContentPreviewStep` is absorbed into the panel's preview accordion.
5. Empty state: editors show placeholder guidance ("Write objectives here, or use Generate with AI above"). No step counters anywhere.

## B. Autosave everywhere

### What exists
- `handleSaveAll` → `saveAllTabs` → single atomic `PUT /api/sow/{id}/bulk-update` (all tabs, pricing snapshotted via `pricingRef`).
- Tab-switch already background-saves (`handleTabChange` fires `handleSaveAll` when dirty); `beforeunload` guard exists.
- Three live paradigms: save-all button (5 tabs), wizard 1s debounce (Objectives), per-field immediate PUTs + 1.5s responsibilities debounce (Signers).

### New shape
1. **One autosave loop in SOWForm**: a debounced effect (1.5s after the last `updateFormData` that marks dirty) calls the existing `handleSaveAll`. Reuses everything battle-tested: atomic bulk-update, pricing snapshot, `isSaving`/`lastSavedAt`/`hasUnsavedChanges` lifecycle. Guards: no autosave while a save is in flight (queue one trailing save); no autosave when `!formData.id`; the `markDirty:false` path (mount-time auto-calc) does not trigger it.
2. **Footer**: "Save all changes" button removed. The save-state indicator stays and becomes the single source of truth: `Saving… / All changes saved / Saved at {time}`. Back/Next unchanged. `beforeunload` guard stays (covers the debounce window; also flush-save on tab switch stays).
3. **Consolidation**: ObjectivesEditor relies on the global loop (its own timer goes away with the wizard). TeamRolesTab's per-field `tab-update` PUTs and its 1.5s responsibilities timer are removed in favor of the global loop; its "Changes are automatically saved" chip is replaced by the global indicator (which SOWForm renders in the footer on every tab). Stale copy ("…saved when you click the save button") is corrected everywhere it appears.
4. **Restricted-edit mode** (pricing-only/signers-only editors): autosave loop respects `restrictedTab` exactly as `handleSaveAll` does today.

## C. Client roles — standard slots

1. **Seed at creation** (`POST /api/sow` handler): new SOWs get `roles.client_roles` pre-populated with the five standard slots from the ENT mining, empty `name`/`email`, canned `responsibilities` (adapting the existing quick-fill strings in TeamRolesTab):
   - Executive Sponsor
   - Project Manager
   - LeanData Administrator
   - Owner of Business Requirements
   - SFDC System Team Point of Contact
2. **Existing SOWs**: an "Add standard roles" button in the client-roles section appends whichever of the five slots aren't already present (matched by role name).
3. Roles remain fully editable/removable — seeding is a starting point, not a constraint. Validation ("at least one client role") is unchanged and trivially satisfied.

## Non-goals

Rejection/approval flow changes (epic #352 owns that); template content changes (Phase 3); any segment gating (Phase 4); changes to the AI generation prompt/endpoint; pricing tab internals beyond the autosave wiring.

## Verification (staging)

- Objectives: open a draft → editors render with existing content; type → autosaves (indicator cycles); Generate with AI → panel → sources → modal → content lands in editors with `*_edited=false`; manual edit flips `*_edited=true`; PDF renders; Review & Submit validation passes/fails on the same conditions as before.
- Autosave: edit each of the 7 tabs → indicator shows Saving…→Saved; no "Save all changes" button anywhere; reload mid-edit after 2s → change persisted; tab-switch mid-debounce → no loss; pricing edits autosave with correct snapshot.
- Client roles: new SOW shows 5 seeded slots; existing SOW shows "Add standard roles"; add/edit/remove still work.

## Test surface

Pure/unit: the field fan-out logic (extracted to `src/lib/sow/objectives-content.ts`: given editor changes or AI results, produce the formData patch with correct `*_edited` flags); the standard-slots seeding/merge helper (`src/lib/sow/standard-client-roles.ts`). Existing suites must stay green (bulk-update payloads unchanged — `tab-payloads.ts` untouched).
