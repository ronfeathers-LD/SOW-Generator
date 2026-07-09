# P4b — Phased Scope + Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give SOWs an editable, structured project-phase model and replace the three duplicated project-timeline `<table>` renderings with one shared horizontal phase-bar visual, while keeping existing SOWs (with no stored phases) rendering exactly the same six-phase timeline they do today.

**Architecture:** A new nullable `sows.timeline_phases JSONB` column holds `[{ name, description, startWeek, durationWeeks }]`. A pure, vitest-covered module (`src/lib/sow/timeline-phases.ts`) owns the phase data model: the canonical six-phase default derived from `timeline_weeks`, duration formatting, phase-bar geometry (left/width %), and row-packing for overlapping phases. One shared React component (`TimelinePhaseBar`) renders the print + full views; `pdf-generator` gets a mirrored HTML-string renderer (its established pattern). The Project Overview tab gains a "Timeline Phases" editing card. When `timeline_phases` is null/empty (every existing SOW), the visual falls back to the computed six-phase default, so nothing regresses.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Supabase/Postgres (JSONB), vitest, Puppeteer (PDF via HTML string), Tailwind.

## Global Constraints

- **Repo / workspace:** SOW-Generator, worktree `~/GitHub/SOW-Generator-p4b`, branch `feature/p4b-phased-visual` (off `origin/main` @ `c5bfd94`, which already includes P4a). `origin` is the only remote; push to `origin`, PR into `main` (staging), promote `main` → `production`.
- **Tests:** `npm test` runs `vitest run`. **`npm test` and `npm run build` must both stay green after every task.** Lint: `npm run lint`.
- **Worktree setup:** deps already installed; `.env.local` copied (local-only creds, ignore for remote).
- **Column name is `timeline_phases`, NOT `project_phases`.** This deviates from the approved design §P4b (which said `sows.project_phases JSONB`). Reason: `project_phases` already exists as a distinct feature — the rich-text "Project Phases, Activities & Artifacts" section uses `sows.custom_project_phases_content` + `project_phases_content_edited` and a `project_phases` section-key (`src/lib/sow-content.ts`). A second `project_phases` would conflate two unrelated concepts (LUCI naming rule: inconsistency is a bug). `timeline_phases` is collision-free and more accurate (these are the "Project Timeline" bar's phases). Do NOT touch `custom_project_phases_content` / `project_phases_content_edited` — different feature.
- **Migration is REQUIRED and applied MANUALLY to BOTH the staging and prod Supabase projects** (staging ref `kajhbohmzkizydvuxnbt`, prod ref `tjpxwgbuzjgsyjvszmdg`). It is additive + idempotent (`ADD COLUMN IF NOT EXISTS`), nullable, no default — apply to staging before the `main` merge and to prod before the `production` promotion. Creds are pullable via `railway variables --environment staging|production --service SOW-Generator --json`.
- **Nullable, no column default.** Existing rows must read back `NULL` so the visual falls back to the computed six-phase default. A `'[]'::jsonb` default would make existing SOWs render an empty timeline — do not use it.
- **JSONB is returned already-parsed by the Supabase client** — read `sow.timeline_phases` as an array directly, no `JSON.parse`; write by assigning the JS array straight to the update object (mirror `products`/`client_roles`).
- **No per-phase fees or hours fields** (unanimous product decision). No changes to the six-phase default split percentages.
- **Grayscale-safe + Puppeteer-safe:** the visual is pure CSS/HTML (no JS, no canvas) so it renders in the PDF; it must be legible in grayscale (rely on borders/labels/text, not color alone).
- **The six default phases (verbatim names, descriptions, ratios):** Engage 0.125 "Project kickoff and planning"; Discovery 0.25 "Requirements gathering and analysis"; Build 0.25 "Solution development and configuration"; Test 0.125 "Quality assurance and validation"; Deploy 0.125 "Production deployment and go-live"; Hypercare 0.125 "Post-deployment support and transition". Ratios sum to 1.0. (Names stored title-case, e.g. "Engage"; the old table showed "ENGAGE" all-caps — a minor cosmetic change since the table is being replaced.)

---

## File Structure

**New files:**
- `src/lib/sow/timeline-phases.ts` — data model, `TimelinePhase` type, `DEFAULT_TIMELINE_PHASE_SPEC`, `defaultTimelinePhases`, `effectiveTimelinePhases`, `formatPhaseDuration`, `phaseGeometry`, `packPhasesIntoRows`, `timelinePhasesExceedWeeks`.
- `src/lib/sow/timeline-phases.test.ts` — full unit coverage of the pure functions.
- `src/components/sow/TimelinePhaseBar.tsx` — the shared React phase-bar visual.
- `supabase/migrations/037_add_timeline_phases.sql` — the new column.

**Modified files:**
- `src/types/sow.ts` — `TimelinePhase` import/def + `timeline_phases?: TimelinePhase[]` on the template shape.
- `src/types/sow-display.ts` — flat `timeline_phases?` for the render views.
- `src/lib/sow/tab-payloads.ts` — Project Overview payload.
- `src/lib/sow/tab-column-mapping.ts` — Project Overview → JSONB column write.
- `src/lib/sow/map-sow-response.ts` (+ `.test.ts`) — GET response `template.timeline_phases`.
- `src/lib/sow/map-api-response-to-display.ts` — flat `timeline_phases` for views.
- `src/app/api/sow/route.ts` — seed at creation.
- `src/app/sow/new/page.tsx`, `src/components/SOWForm.tsx` — form-init defaults.
- `src/components/sow/ProjectOverviewTab.tsx` — the "Timeline Phases" editing card.
- `src/components/sow/SOWPrintView.tsx`, `src/components/sow/SOWFullView.tsx`, `src/lib/pdf-generator.ts` — swap inline tables for the shared visual.

**Deleted:**
- `src/components/sow/TimelineDisplay.tsx` — dead code (never imported), superseded by `TimelinePhaseBar`.

---

## Task 1: Timeline-phase data model + pure helpers

**Files:**
- Create: `src/lib/sow/timeline-phases.ts`
- Test: `src/lib/sow/timeline-phases.test.ts`
- Modify: `src/types/sow.ts`

**Interfaces:**
- Produces: `TimelinePhase` (`{ name: string; description: string; startWeek: number; durationWeeks: number }`), `DEFAULT_TIMELINE_PHASE_SPEC`, `defaultTimelinePhases(timelineWeeks)`, `effectiveTimelinePhases(phases, timelineWeeks)`, `formatPhaseDuration(weeks)`, `phaseGeometry(phase, totalWeeks)`, `packPhasesIntoRows(phases)`, `timelinePhasesExceedWeeks(phases, timelineWeeks)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sow/timeline-phases.test.ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMELINE_PHASE_SPEC,
  defaultTimelinePhases,
  effectiveTimelinePhases,
  formatPhaseDuration,
  phaseGeometry,
  packPhasesIntoRows,
  timelinePhasesExceedWeeks,
} from './timeline-phases';

describe('DEFAULT_TIMELINE_PHASE_SPEC', () => {
  it('is the six canonical phases in order with ratios summing to 1', () => {
    expect(DEFAULT_TIMELINE_PHASE_SPEC.map((p) => p.name)).toEqual([
      'Engage', 'Discovery', 'Build', 'Test', 'Deploy', 'Hypercare',
    ]);
    const sum = DEFAULT_TIMELINE_PHASE_SPEC.reduce((a, p) => a + p.ratio, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('defaultTimelinePhases', () => {
  it('derives sequential startWeek + durationWeeks from timeline_weeks', () => {
    const phases = defaultTimelinePhases('16');
    expect(phases).toHaveLength(6);
    expect(phases[0]).toMatchObject({ name: 'Engage', startWeek: 0, durationWeeks: 2 });      // 16*0.125
    expect(phases[1]).toMatchObject({ name: 'Discovery', startWeek: 2, durationWeeks: 4 });    // 16*0.25
    expect(phases[2]).toMatchObject({ name: 'Build', startWeek: 6, durationWeeks: 4 });
    expect(phases[5]).toMatchObject({ name: 'Hypercare', startWeek: 14, durationWeeks: 2 });
    // startWeeks accumulate to total
    const last = phases[5];
    expect(last.startWeek + last.durationWeeks).toBeCloseTo(16, 6);
  });

  it('returns an empty array for empty/invalid/zero timeline_weeks', () => {
    expect(defaultTimelinePhases('')).toEqual([]);
    expect(defaultTimelinePhases('999')).toEqual([]); // legacy sentinel treated as unset
    expect(defaultTimelinePhases('0')).toEqual([]);
    expect(defaultTimelinePhases('abc')).toEqual([]);
  });
});

describe('effectiveTimelinePhases', () => {
  it('uses stored phases when present and non-empty', () => {
    const stored = [{ name: 'A', description: '', startWeek: 0, durationWeeks: 3 }];
    expect(effectiveTimelinePhases(stored, '10')).toBe(stored);
  });
  it('falls back to the computed default when phases are null/empty', () => {
    expect(effectiveTimelinePhases(null, '8')).toHaveLength(6);
    expect(effectiveTimelinePhases([], '8')).toHaveLength(6);
    expect(effectiveTimelinePhases(undefined, '')).toEqual([]);
  });
});

describe('formatPhaseDuration', () => {
  it('renders weeks, or days when under one week, with singular/plural', () => {
    expect(formatPhaseDuration(2)).toBe('2 weeks');
    expect(formatPhaseDuration(1)).toBe('1 week');
    expect(formatPhaseDuration(2.5)).toBe('2.5 weeks');
    expect(formatPhaseDuration(0.5)).toBe('4 days');   // ceil(0.5*7)=4
    expect(formatPhaseDuration(1 / 7)).toBe('1 day');
  });
});

describe('phaseGeometry', () => {
  it('computes left/width percentages clamped to the bar', () => {
    expect(phaseGeometry({ name: '', description: '', startWeek: 2, durationWeeks: 4 }, 16))
      .toEqual({ leftPct: 12.5, widthPct: 25 });
    // clamps overflow so left+width never exceeds 100
    const g = phaseGeometry({ name: '', description: '', startWeek: 14, durationWeeks: 10 }, 16);
    expect(g.leftPct).toBeCloseTo(87.5, 6);
    expect(g.leftPct + g.widthPct).toBeLessThanOrEqual(100 + 1e-9);
  });
  it('returns zero-width for non-positive total', () => {
    expect(phaseGeometry({ name: '', description: '', startWeek: 0, durationWeeks: 1 }, 0))
      .toEqual({ leftPct: 0, widthPct: 0 });
  });
});

describe('packPhasesIntoRows', () => {
  it('keeps non-overlapping phases on one row', () => {
    const phases = [
      { name: 'A', description: '', startWeek: 0, durationWeeks: 2 },
      { name: 'B', description: '', startWeek: 2, durationWeeks: 2 },
    ];
    expect(packPhasesIntoRows(phases)).toHaveLength(1);
  });
  it('stacks overlapping phases onto separate rows (Veeam parallel pattern)', () => {
    const phases = [
      { name: 'A', description: '', startWeek: 0, durationWeeks: 5 },
      { name: 'B', description: '', startWeek: 2, durationWeeks: 5 },
    ];
    const rows = packPhasesIntoRows(phases);
    expect(rows).toHaveLength(2);
    expect(rows[0].map((p) => p.name)).toEqual(['A']);
    expect(rows[1].map((p) => p.name)).toEqual(['B']);
  });
});

describe('timelinePhasesExceedWeeks', () => {
  it('is true when any phase ends past timeline_weeks', () => {
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 6, durationWeeks: 5 }], '10')).toBe(true);
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 0, durationWeeks: 10 }], '10')).toBe(false);
  });
  it('is false when timeline_weeks is unset (nothing to exceed)', () => {
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 0, durationWeeks: 5 }], '')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test -- timeline-phases`
Expected: FAIL — `Cannot find module './timeline-phases'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sow/timeline-phases.ts

/** One phase in a SOW's project timeline. Weeks are relative to project start. */
export interface TimelinePhase {
  name: string;
  description: string;
  startWeek: number;
  durationWeeks: number;
}

/** Canonical six-phase split. Ratios are fractions of total timeline_weeks and sum to 1.
 * Names/descriptions preserve the historical timeline-table literals (title-cased). */
export const DEFAULT_TIMELINE_PHASE_SPEC: ReadonlyArray<{ name: string; description: string; ratio: number }> = [
  { name: 'Engage', description: 'Project kickoff and planning', ratio: 0.125 },
  { name: 'Discovery', description: 'Requirements gathering and analysis', ratio: 0.25 },
  { name: 'Build', description: 'Solution development and configuration', ratio: 0.25 },
  { name: 'Test', description: 'Quality assurance and validation', ratio: 0.125 },
  { name: 'Deploy', description: 'Production deployment and go-live', ratio: 0.125 },
  { name: 'Hypercare', description: 'Post-deployment support and transition', ratio: 0.125 },
];

/** Parse timeline_weeks (TEXT column; may be '', 'abc', legacy '999', or a number string). */
export function parseTimelineWeeks(timelineWeeks: string | number | null | undefined): number {
  const n = typeof timelineWeeks === 'number' ? timelineWeeks : parseFloat(String(timelineWeeks ?? ''));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (String(timelineWeeks).trim() === '999') return 0; // legacy "unset" sentinel
  return n;
}

/** The default six phases derived from timeline_weeks, with sequential startWeek. Empty if unset. */
export function defaultTimelinePhases(timelineWeeks: string | number | null | undefined): TimelinePhase[] {
  const total = parseTimelineWeeks(timelineWeeks);
  if (total <= 0) return [];
  const phases: TimelinePhase[] = [];
  let cursor = 0;
  for (const spec of DEFAULT_TIMELINE_PHASE_SPEC) {
    const durationWeeks = total * spec.ratio;
    phases.push({ name: spec.name, description: spec.description, startWeek: cursor, durationWeeks });
    cursor += durationWeeks;
  }
  return phases;
}

/** Stored phases if present + non-empty; otherwise the computed default (fallback for existing SOWs). */
export function effectiveTimelinePhases(
  phases: TimelinePhase[] | null | undefined,
  timelineWeeks: string | number | null | undefined
): TimelinePhase[] {
  if (Array.isArray(phases) && phases.length > 0) return phases;
  return defaultTimelinePhases(timelineWeeks);
}

/** Human label for a duration in weeks: days when < 1 week, else weeks (1 decimal), singular/plural. */
export function formatPhaseDuration(weeks: number): string {
  if (!Number.isFinite(weeks) || weeks <= 0) return '0 weeks';
  if (weeks < 1) {
    const days = Math.ceil(weeks * 7);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  const w = Math.round(weeks * 10) / 10;
  return `${w} week${w === 1 ? '' : 's'}`;
}

/** Position (left) + width as percentages of the total bar, clamped to [0, 100]. */
export function phaseGeometry(phase: TimelinePhase, totalWeeks: number): { leftPct: number; widthPct: number } {
  if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return { leftPct: 0, widthPct: 0 };
  const leftPct = Math.min(100, Math.max(0, (phase.startWeek / totalWeeks) * 100));
  const rawWidth = (phase.durationWeeks / totalWeeks) * 100;
  const widthPct = Math.min(100 - leftPct, Math.max(0, rawWidth));
  return { leftPct, widthPct };
}

/** Greedy row-packing: each phase goes on the first row where it does not overlap an existing phase. */
export function packPhasesIntoRows(phases: TimelinePhase[]): TimelinePhase[][] {
  const rows: TimelinePhase[][] = [];
  const end = (p: TimelinePhase) => p.startWeek + p.durationWeeks;
  const overlaps = (a: TimelinePhase, b: TimelinePhase) => a.startWeek < end(b) && b.startWeek < end(a);
  for (const phase of phases) {
    let placed = false;
    for (const row of rows) {
      if (!row.some((p) => overlaps(p, phase))) {
        row.push(phase);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([phase]);
  }
  return rows;
}

/** True when any phase ends past timeline_weeks (used for a non-blocking warning). */
export function timelinePhasesExceedWeeks(
  phases: TimelinePhase[],
  timelineWeeks: string | number | null | undefined
): boolean {
  const total = parseTimelineWeeks(timelineWeeks);
  if (total <= 0) return false;
  return phases.some((p) => p.startWeek + p.durationWeeks > total + 1e-9);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test -- timeline-phases`
Expected: PASS.

- [ ] **Step 5: Add `TimelinePhase` to the SOW template type**

In `src/types/sow.ts`, import/define `TimelinePhase` and add it to the template shape (the `SOWTemplate` interface, near `timeline_weeks: string;` around line 51):

```ts
import type { TimelinePhase } from '@/lib/sow/timeline-phases';
// ... inside the template/SOWTemplate interface, after timeline_weeks:
  timeline_phases?: TimelinePhase[];
```

Read the file first to confirm the exact interface name and that a top-level `import type` is appropriate (avoid a circular type import — `timeline-phases.ts` must NOT import from `types/sow.ts`; it does not).

- [ ] **Step 6: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test -- timeline-phases && npm run build`
Expected: PASS + build success.

- [ ] **Step 7: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4b
git add src/lib/sow/timeline-phases.ts src/lib/sow/timeline-phases.test.ts src/types/sow.ts
git commit -m "feat(p4b): timeline-phase data model, defaults, geometry, row-packing"
```

---

## Task 2: Migration + field threading (payload/mapping/creation)

**Files:**
- Create: `supabase/migrations/037_add_timeline_phases.sql`
- Modify: `src/lib/sow/tab-payloads.ts`, `src/lib/sow/tab-column-mapping.ts`, `src/lib/sow/map-sow-response.ts`, `src/lib/sow/map-api-response-to-display.ts`, `src/types/sow-display.ts`, `src/app/api/sow/route.ts`, `src/app/sow/new/page.tsx`, `src/components/SOWForm.tsx`
- Test: `src/lib/sow/map-sow-response.test.ts`

**Interfaces:**
- Consumes: `TimelinePhase`, `defaultTimelinePhases` from `./timeline-phases`.
- Produces: `timeline_phases` round-trips form → DB → response; new SOWs seed it from `timeline_weeks`; existing/null rows map to `[]` on the display shape and `undefined`/absent on the template shape so the visual computes the fallback.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/037_add_timeline_phases.sql
-- Structured, editable project-timeline phases for the phase-bar visual (P4b).
-- NULLABLE, NO DEFAULT on purpose: existing rows read back NULL so the visual
-- falls back to the computed six-phase default derived from timeline_weeks.
-- Distinct from the rich-text `custom_project_phases_content` section (different feature).
ALTER TABLE sows ADD COLUMN IF NOT EXISTS timeline_phases JSONB;

COMMENT ON COLUMN sows.timeline_phases IS
  'Structured project-timeline phases [{name,description,startWeek,durationWeeks}] for the phase-bar visual (P4b). NULL = use computed default from timeline_weeks. Not the same as custom_project_phases_content (rich-text section 3).';
```

(Do NOT apply it here — application to staging/prod DBs happens at deploy time, Task 6.)

- [ ] **Step 2: Write the failing mapper test**

Add to `src/lib/sow/map-sow-response.test.ts` (mirror the existing `timeline_weeks` default block; use the file's real `rowWith`/`mapSowRowToResponse` names — read the file first):

```ts
describe('mapSowRowToResponse timeline_phases', () => {
  it('passes stored timeline_phases through onto template', () => {
    const phases = [{ name: 'Engage', description: 'x', startWeek: 0, durationWeeks: 2 }];
    const result = mapSowRowToResponse(rowWith({ timeline_phases: phases }));
    expect(result.template.timeline_phases).toEqual(phases);
  });
  it('maps a NULL timeline_phases to an empty array on the template', () => {
    const result = mapSowRowToResponse(rowWith({ timeline_phases: null }));
    expect(result.template.timeline_phases).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test -- map-sow-response`
Expected: FAIL — `template.timeline_phases` is undefined.

- [ ] **Step 4: Thread the field through each file**

Read each adjacent line first; mirror the exact idiom used for `timeline_weeks` / `products`.

- `src/lib/sow/tab-payloads.ts` (Project Overview case, beside `timeline_weeks: template?.timeline_weeks,` ~line 92):
  ```ts
  timeline_phases: template?.timeline_phases,
  ```
- `src/lib/sow/tab-column-mapping.ts` (Project Overview case, beside the products JSONB block ~lines 48/70-73):
  ```ts
  if (d.template?.timeline_phases !== undefined) {
    updateData.timeline_phases = d.template.timeline_phases;
  }
  ```
- `src/lib/sow/map-sow-response.ts` (in the `template` object, beside `timeline_weeks: sow.timeline_weeks || '',` ~line 120):
  ```ts
  timeline_phases: Array.isArray(sow.timeline_phases) ? sow.timeline_phases : [],
  ```
- `src/lib/sow/map-api-response-to-display.ts` (beside `timeline_weeks` ~line 110) — flat field for the render views:
  ```ts
  timeline_phases: data.template?.timeline_phases ?? [],
  ```
- `src/types/sow-display.ts` (beside `timeline_weeks?: string;` ~line 108):
  ```ts
  timeline_phases?: import('@/lib/sow/timeline-phases').TimelinePhase[];
  ```
- `src/app/api/sow/route.ts` (creation insert, beside `timeline_weeks: data.template?.timeline_weeks || ''` ~line 128) — seed from timeline_weeks at creation:
  ```ts
  timeline_phases: data.template?.timeline_phases ?? defaultTimelinePhases(data.template?.timeline_weeks || ''),
  ```
  (add `import { defaultTimelinePhases } from '@/lib/sow/timeline-phases';` at the top.)
- `src/app/sow/new/page.tsx` (initial form default, beside `timeline_weeks: ''` ~line 63):
  ```ts
  timeline_phases: [],
  ```
- `src/components/SOWForm.tsx` (form-init defaults ~lines 119/209) — add `timeline_phases: []` to the template init object beside `timeline_weeks` if that object enumerates template fields; if it spreads existing template, no change needed (verify by reading).

- [ ] **Step 5: Run tests + build**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test && npm run build`
Expected: PASS + build success.

- [ ] **Step 6: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4b
git add supabase/migrations/037_add_timeline_phases.sql src/lib/sow/tab-payloads.ts src/lib/sow/tab-column-mapping.ts src/lib/sow/map-sow-response.ts src/lib/sow/map-api-response-to-display.ts src/types/sow-display.ts src/app/api/sow/route.ts src/app/sow/new/page.tsx src/components/SOWForm.tsx src/lib/sow/map-sow-response.test.ts
git commit -m "feat(p4b): add timeline_phases JSONB column + thread through payload/mapping/creation"
```

---

## Task 3: Shared `TimelinePhaseBar` visual component

**Files:**
- Create: `src/components/sow/TimelinePhaseBar.tsx`
- Delete: `src/components/sow/TimelineDisplay.tsx` (dead code, never imported)

**Interfaces:**
- Consumes: `TimelinePhase`, `effectiveTimelinePhases`, `parseTimelineWeeks`, `phaseGeometry`, `packPhasesIntoRows`, `formatPhaseDuration` from `@/lib/sow/timeline-phases`.
- Produces: `<TimelinePhaseBar phases={...} timelineWeeks={...} />` — a pure CSS/HTML horizontal phase bar. Used by SOWPrintView + SOWFullView in Task 4.

- [ ] **Step 1: Confirm `TimelineDisplay.tsx` is unused, then delete it**

Run: `cd ~/GitHub/SOW-Generator-p4b && grep -rn "TimelineDisplay" src/ --include=*.tsx --include=*.ts`
Expected: only self-references inside `TimelineDisplay.tsx`. Then:
```bash
git rm src/components/sow/TimelineDisplay.tsx
```
If grep shows any import elsewhere, STOP and report (do not delete).

- [ ] **Step 2: Write the component**

```tsx
// src/components/sow/TimelinePhaseBar.tsx
import React from 'react';
import {
  type TimelinePhase,
  effectiveTimelinePhases,
  parseTimelineWeeks,
  phaseGeometry,
  packPhasesIntoRows,
  formatPhaseDuration,
} from '@/lib/sow/timeline-phases';

interface TimelinePhaseBarProps {
  phases?: TimelinePhase[] | null;
  timelineWeeks?: string | number | null;
}

/**
 * Horizontal project-timeline visual: a week-axis strip with one labeled block per
 * phase (position = startWeek, width = durationWeeks), descriptions listed beneath.
 * Pure CSS/HTML so Puppeteer renders it; grayscale-safe (border + text, not color alone).
 * Overlapping/parallel phases stack onto separate rows.
 */
export default function TimelinePhaseBar({ phases, timelineWeeks }: TimelinePhaseBarProps) {
  const total = parseTimelineWeeks(timelineWeeks);
  const effective = effectiveTimelinePhases(phases ?? null, timelineWeeks);
  if (total <= 0 || effective.length === 0) return null;

  const rows = packPhasesIntoRows(effective);

  return (
    <div className="my-4">
      <h3 className="text-lg font-semibold mb-3">Project Timeline</h3>
      <div className="rounded border border-gray-300 p-4">
        {/* phase bars */}
        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="relative h-9 w-full">
              {row.map((phase, i) => {
                const { leftPct, widthPct } = phaseGeometry(phase, total);
                return (
                  <div
                    key={`${phase.name}-${i}`}
                    className="absolute top-0 h-9 rounded border border-gray-700 bg-gray-100 px-2 flex items-center overflow-hidden"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${phase.name} — ${formatPhaseDuration(phase.durationWeeks)}`}
                  >
                    <span className="text-xs font-semibold text-gray-800 truncate">{phase.name}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* week axis */}
        <div className="mt-2 flex justify-between text-[10px] text-gray-500">
          <span>Week 0</span>
          <span>Week {Math.round(total * 10) / 10}</span>
        </div>
        {/* descriptions */}
        <ul className="mt-3 space-y-1">
          {effective.map((phase, i) => (
            <li key={`${phase.name}-desc-${i}`} className="text-xs text-gray-700">
              <span className="font-semibold">{phase.name}</span>
              {phase.description ? ` — ${phase.description}` : ''}
              {' '}<span className="text-gray-500">({formatPhaseDuration(phase.durationWeeks)})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test && npm run build`
Expected: PASS + build success (no component-test harness exists; the layout math is covered by Task 1's unit tests, and the component is verified in the browser during Task 6 staging).

- [ ] **Step 4: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4b
git add src/components/sow/TimelinePhaseBar.tsx
git commit -m "feat(p4b): shared TimelinePhaseBar visual; remove dead TimelineDisplay"
```

---

## Task 4: Replace the three inline timeline tables with the shared visual

**Files:**
- Modify: `src/components/sow/SOWPrintView.tsx` (228-280), `src/components/sow/SOWFullView.tsx` (673-725), `src/lib/pdf-generator.ts` (1236-1298)
- Modify: `src/lib/sow/timeline-phases.ts` — add `renderTimelinePhaseBarHtml` for the PDF

**Interfaces:**
- Consumes: `TimelinePhaseBar` (React), and a new pure `renderTimelinePhaseBarHtml(phases, timelineWeeks): string` for the PDF HTML-string path.
- Produces: identical six-phase visual across print/full/PDF for existing SOWs (fallback), custom phases for edited SOWs.

- [ ] **Step 1: Read the three current table blocks**

Run:
```bash
cd ~/GitHub/SOW-Generator-p4b
sed -n '226,282p' src/components/sow/SOWPrintView.tsx
sed -n '671,727p' src/components/sow/SOWFullView.tsx
sed -n '1234,1300p' src/lib/pdf-generator.ts
```
Confirm current line ranges (they may have drifted) and how each guards on `timeline_weeks` (pdf also guards `!== '999'`).

- [ ] **Step 2: Add the PDF HTML-string renderer to `timeline-phases.ts`**

Append to `src/lib/sow/timeline-phases.ts`:

```ts
function escapePhaseHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** PDF/Puppeteer HTML-string mirror of TimelinePhaseBar (grayscale-safe, no JS). */
export function renderTimelinePhaseBarHtml(
  phases: TimelinePhase[] | null | undefined,
  timelineWeeks: string | number | null | undefined
): string {
  const total = parseTimelineWeeks(timelineWeeks);
  const effective = effectiveTimelinePhases(phases ?? null, timelineWeeks);
  if (total <= 0 || effective.length === 0) return '';
  const rows = packPhasesIntoRows(effective);
  const bars = rows.map((row) => {
    const blocks = row.map((phase) => {
      const { leftPct, widthPct } = phaseGeometry(phase, total);
      return `<div style="position:absolute;top:0;height:32px;left:${leftPct}%;width:${widthPct}%;border:1px solid #374151;background:#f3f4f6;padding:0 6px;display:flex;align-items:center;overflow:hidden;border-radius:3px;"><span style="font-size:11px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapePhaseHtml(phase.name)}</span></div>`;
    }).join('');
    return `<div style="position:relative;height:32px;width:100%;margin-bottom:8px;">${blocks}</div>`;
  }).join('');
  const descriptions = effective.map((phase) =>
    `<li style="font-size:11px;color:#374151;margin-bottom:2px;"><strong>${escapePhaseHtml(phase.name)}</strong>${phase.description ? ' — ' + escapePhaseHtml(phase.description) : ''} <span style="color:#6b7280;">(${formatPhaseDuration(phase.durationWeeks)})</span></li>`
  ).join('');
  return `
    <h3 style="font-size:16px;font-weight:600;margin:16px 0 12px;">Project Timeline</h3>
    <div style="border:1px solid #d1d5db;border-radius:6px;padding:16px;">
      <div>${bars}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:4px;"><span>Week 0</span><span>Week ${Math.round(total * 10) / 10}</span></div>
      <ul style="margin-top:12px;padding-left:0;list-style:none;">${descriptions}</ul>
    </div>`;
}
```

Add a unit test to `timeline-phases.test.ts` asserting `renderTimelinePhaseBarHtml` returns `''` for unset weeks and contains each phase name + escapes injected names for a 16-week default.

- [ ] **Step 3: Swap `SOWPrintView.tsx`**

Replace the entire timeline-table block (the `{sow.timeline_weeks && ( ... )}` region ~228-280) with:
```tsx
import TimelinePhaseBar from './TimelinePhaseBar';
// ... in place of the old block:
<TimelinePhaseBar phases={sow.timeline_phases} timelineWeeks={sow.timeline_weeks} />
```
`TimelinePhaseBar` returns `null` when there is no timeline, so the old `{sow.timeline_weeks && ...}` guard is no longer needed. Confirm `sow` here is the display shape carrying flat `timeline_phases` (threaded in Task 2); if this view receives the response shape instead, read `sow.template?.timeline_phases`.

- [ ] **Step 4: Swap `SOWFullView.tsx`**

Same replacement for its timeline-table block (~673-725):
```tsx
import TimelinePhaseBar from './TimelinePhaseBar';
// ...
<TimelinePhaseBar phases={sow.timeline_phases} timelineWeeks={sow.timeline_weeks} />
```

- [ ] **Step 5: Swap `pdf-generator.ts`**

Replace the inline timeline-table template block (~1236-1298, including the `!== '999'` guard and the "Project Timeline Required" warning box) with a call to the HTML renderer, preserving the empty-state warning:
```ts
import { renderTimelinePhaseBarHtml } from '@/lib/sow/timeline-phases';
// ... where the block was:
${(sowData.timeline_weeks && sowData.timeline_weeks !== '999')
  ? renderTimelinePhaseBarHtml(sowData.timeline_phases, sowData.timeline_weeks)
  : `<!-- keep the existing red "Project Timeline Required" warning box HTML here verbatim -->`}
```
Read the current warning-box HTML (lines ~1291-1298) and keep it verbatim in the `else` branch. Add `timeline_phases?: TimelinePhase[]` to the pdf-generator SOW data type (~line 200) so `sowData.timeline_phases` type-checks.

- [ ] **Step 6: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test && npm run build`
Expected: PASS + build success.

- [ ] **Step 7: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4b
git add src/lib/sow/timeline-phases.ts src/lib/sow/timeline-phases.test.ts src/components/sow/SOWPrintView.tsx src/components/sow/SOWFullView.tsx src/lib/pdf-generator.ts
git commit -m "feat(p4b): render shared phase-bar visual in print, full, and PDF views"
```

---

## Task 5: "Timeline Phases" editing card in Project Overview

**Files:**
- Modify: `src/components/sow/ProjectOverviewTab.tsx`

**Interfaces:**
- Consumes: `TimelinePhase`, `defaultTimelinePhases`, `timelinePhasesExceedWeeks` from `@/lib/sow/timeline-phases`; the `formData` / `setFormData` props already on the tab.
- Produces: an editable list bound to `formData.template.timeline_phases`; autosaves via the existing global debounce (no new save wiring).

- [ ] **Step 1: Read the timeline field + the TeamRolesTab row idiom**

Run:
```bash
cd ~/GitHub/SOW-Generator-p4b
sed -n '485,535p' src/components/sow/ProjectOverviewTab.tsx
sed -n '620,810p' src/components/sow/TeamRolesTab.tsx
```
Mirror the client_roles add/edit/remove idiom (copy array → mutate → `setFormData`).

- [ ] **Step 2: Add the "Timeline Phases" card directly under the Timeline (Weeks) field**

Insert after the timeline field's closing `</div>` (~line 510), inside the same Card. Bind to `formData.template?.timeline_phases`. Provide: an Empty state; one row per phase with inputs for **Name** (text), **Description** (text), **Start (wk)** (number), **Duration (wk)** (number); a **Remove** button per row; **Move up/down** buttons (swap adjacent indices); an **Add phase** button (appends `{ name: '', description: '', startWeek: 0, durationWeeks: 1 }`); a **Reset from timeline** button (`setFormData` template.timeline_phases = `defaultTimelinePhases(formData.template?.timeline_weeks || '')`); and a non-blocking warning line when `timelinePhasesExceedWeeks(phases, timeline_weeks)` is true. NO fee/hours inputs.

Example structure (mirror TeamRolesTab's `setFormData` idiom exactly for every mutation):

```tsx
import { defaultTimelinePhases, timelinePhasesExceedWeeks, type TimelinePhase } from '@/lib/sow/timeline-phases';
// ...
{(() => {
  const phases: TimelinePhase[] = formData.template?.timeline_phases ?? [];
  const setPhases = (next: TimelinePhase[]) =>
    setFormData({ ...formData, template: { ...formData.template!, timeline_phases: next } });
  const updatePhase = (i: number, patch: Partial<TimelinePhase>) => {
    const next = [...phases]; next[i] = { ...next[i], ...patch }; setPhases(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= phases.length) return;
    const next = [...phases]; [next[i], next[j]] = [next[j], next[i]]; setPhases(next);
  };
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Timeline Phases</label>
        <button type="button" className="text-sm text-blue-600"
          onClick={() => setPhases(defaultTimelinePhases(formData.template?.timeline_weeks || ''))}>
          Reset from timeline
        </button>
      </div>
      {phases.length === 0 && (
        <p className="text-sm text-gray-500">No custom phases. The default six-phase timeline is used until you add or reset phases.</p>
      )}
      {phases.map((phase, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
          <input className="col-span-3 border rounded px-2 py-1 text-sm" placeholder="Name"
            value={phase.name} onChange={(e) => updatePhase(index, { name: e.target.value })} />
          <input className="col-span-4 border rounded px-2 py-1 text-sm" placeholder="Description"
            value={phase.description} onChange={(e) => updatePhase(index, { description: e.target.value })} />
          <input className="col-span-1 border rounded px-2 py-1 text-sm" type="number" step="0.5" placeholder="Start"
            value={phase.startWeek} onChange={(e) => updatePhase(index, { startWeek: parseFloat(e.target.value) || 0 })} />
          <input className="col-span-1 border rounded px-2 py-1 text-sm" type="number" step="0.5" placeholder="Dur"
            value={phase.durationWeeks} onChange={(e) => updatePhase(index, { durationWeeks: parseFloat(e.target.value) || 0 })} />
          <div className="col-span-3 flex gap-1">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-xs px-1 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === phases.length - 1} className="text-xs px-1 disabled:opacity-30">↓</button>
            <button type="button" onClick={() => setPhases(phases.filter((_, i) => i !== index))} className="text-xs text-red-600">Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="text-sm text-blue-600 mt-1"
        onClick={() => setPhases([...phases, { name: '', description: '', startWeek: 0, durationWeeks: 1 }])}>
        + Add phase
      </button>
      {timelinePhasesExceedWeeks(phases, formData.template?.timeline_weeks || '') && (
        <p className="mt-2 text-sm text-amber-600">Warning: one or more phases extend past the timeline of {formData.template?.timeline_weeks} weeks.</p>
      )}
    </div>
  );
})()}
```

Match the tab's existing styling primitives (it uses an `Input` component and Card — use those where the file does; the raw `<input>` above is illustrative, prefer the file's `Input` if it accepts these props). Keep the card title "Timeline Phases" (distinct from the Content tab's "Project Phases, Activities & Artifacts").

- [ ] **Step 3: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4b && npm test && npm run build`
Expected: PASS + build success.

- [ ] **Step 4: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4b
git add src/components/sow/ProjectOverviewTab.tsx
git commit -m "feat(p4b): Timeline Phases editing card in Project Overview (add/remove/reorder/reset)"
```

---

## Task 6: Deploy — migration to both DBs, staging verify, promote

- [ ] **Step 1: Apply migration `037` to the STAGING Supabase**

Pull staging creds (`railway variables --environment staging --service SOW-Generator --json` → `SUPABASE_SERVICE_ROLE_KEY`, ref `kajhbohmzkizydvuxnbt`) and run the migration SQL via the REST/SQL path (or Supabase SQL editor). It is idempotent (`ADD COLUMN IF NOT EXISTS`). Confirm the column exists.

- [ ] **Step 2: Push branch + open PR to `main`**

```bash
cd ~/GitHub/SOW-Generator-p4b
git push -u origin feature/p4b-phased-visual
gh pr create --repo ronfeathers-LD/SOW-Generator --base main \
  --title "P4b: phased scope + shared timeline visual" \
  --body "Adds editable sows.timeline_phases (JSONB, nullable), a Timeline Phases editing card, and one shared phase-bar visual replacing the three duplicated timeline tables. Existing SOWs (null phases) fall back to the computed six-phase default, so nothing regresses. Migration 037 applied to staging before merge. Column named timeline_phases (not project_phases) to avoid collision with the existing custom_project_phases_content section."
```
Merge to `main` (no CI/review gate) → staging deploys.

- [ ] **Step 3: Verify on staging**

- New SOW with a timeline (e.g. 16 weeks) → the phase bar renders six default blocks in print, full view, and PDF; PDF paginates cleanly.
- Edit phases in the Project Overview "Timeline Phases" card (rename, change start/duration, add an overlapping phase) → the visual updates in all three outputs; overlapping phases stack on separate rows.
- "Reset from timeline" repopulates the six defaults; the over-timeline warning shows (non-blocking) when a phase runs past `timeline_weeks`.
- An existing SOW (created before this change, `timeline_phases` NULL) still renders its six-phase timeline unchanged.

- [ ] **Step 4: Apply migration `037` to PROD + promote**

Apply the same migration to the PROD Supabase (ref `tjpxwgbuzjgsyjvszmdg`) BEFORE promoting. Then:
```bash
gh pr create --repo ronfeathers-LD/SOW-Generator --base production --head main \
  --title "Deploy: P4b phased scope + timeline visual" \
  --body "Promotes P4b. Migration 037 (timeline_phases) applied to prod. Additive/nullable, no data backfill needed."
```
Merge as a merge commit → prod deploys. Verify prod renders the phase bar and existing SOWs are unchanged.

---

## Self-Review

**Spec coverage (design §P4b):**
- b1 data model (`project_phases`→`timeline_phases` JSONB `[{name,description,startWeek,durationWeeks}]`; default from `timeline_weeks` × six-phase split; extracted `DEFAULT_TIMELINE_PHASE_SPEC`; editing `timeline_weeks` does not silently rescale customized phases — it doesn't, phases are independent; "Reset from timeline" action) → Tasks 1, 2, 5.
- b2 editing (Project Overview card of name/description/start/duration with add/remove/reorder; standard payload/mapping path; autosaved; NO fee/hours; warn-not-block when phases exceed `timeline_weeks`) → Tasks 2, 5.
- b3 phase visual (three duplicated tables → one shared horizontal phase-bar; week axis; blocks positioned by startWeek/width by durationWeeks; descriptions beneath; pure CSS/HTML for Puppeteer; grayscale-safe; shared React component + mirrored pdf-generator HTML string; overlapping phases stack) → Tasks 3, 4.
- Verification (6 default phases; edit/add/remove → visual updates in all three outputs; PDF paginates) → Task 6.
- Test surface (`DEFAULT_TIMELINE_PHASES` generator; phase-visual layout math) → Task 1.
- Migration to BOTH DBs, staging before merge / prod before promotion → Task 6.

**Deviation flagged (needs no code change but is a design departure):** column named `timeline_phases`, not `project_phases`, to avoid conflict with the existing `custom_project_phases_content` / `project_phases` section-key feature. Documented in Global Constraints.

**Placeholder scan:** none. Every code step has complete code; the one "read current block first" step (Task 4) is a safety confirmation of drifted line numbers, not a placeholder.

**Type consistency:** `TimelinePhase` (Task 1) is used identically in Tasks 2-5. `defaultTimelinePhases` / `effectiveTimelinePhases` / `phaseGeometry` / `packPhasesIntoRows` / `formatPhaseDuration` / `parseTimelineWeeks` / `timelinePhasesExceedWeeks` / `renderTimelinePhaseBarHtml` names are consistent across the module and its consumers.
