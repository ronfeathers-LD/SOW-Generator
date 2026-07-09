# P4a — SVF + House-Voice AI Scope Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the AI transcription analysis so generated deliverables AND a new generated scope section are organized under the four SVF pillars (Acquire / Adopt / Retain / Expand) and written in the LeanData house voice, while keeping full back-compat with the old flat `solutions` shape.

**Architecture:** The Gemini JSON contract (`src/lib/gemini.ts`) gains a pillar-nested `solutions` array plus a new `scopeItems` array. A pair of pure, vitest-covered content builders (`src/lib/sow/svf-content.ts`) turn either the old flat shape OR the new pillar shape into HTML/text, so every consumer (the AI modal, the preview page, the Avoma passthrough route) renders both. Scope content fans out through the existing `aiGenerationPatch` triple (`custom_scope_content` / `ai_generated_scope_content` / `scope_content_edited`) into columns that already exist in both DBs. The house voice itself lives in the DB-driven `ai_prompts` active row (admin-editable, versioned, revertable), reseeded from repo-committed text that includes voice rules, SVF pillar definitions, and Ron-approved exemplar passages mined from the LeanData-paper SOWs.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, `@google/generative-ai` (Gemini 2.5 Flash), Supabase/Postgres, vitest, TipTap (Content tab editor), Puppeteer (PDF).

## Global Constraints

- **Repo / workspace:** `leandata` SOW-Generator. Work in the worktree `~/GitHub/SOW-Generator-p4a` on branch `feature/p4a-svf-house-voice`, already created off `origin/main` (`eba6540`). This is a standalone repo — `origin` is the only remote; the LUCI fork/upstream rules do NOT apply. Push branches to `origin`, PR into `origin/main` (staging), promote `main` → `production`.
- **Tests:** `npm test` runs `vitest run`. **`npm test` and `npm run build` must both stay green after every task.** Lint: `npm run lint`.
- **Worktree setup:** run `npm install` in the worktree once before building, and copy `.env.local` from the primary tree (`cp ~/GitHub/SOW-Generator/.env.local ~/GitHub/SOW-Generator-p4a/.env.local`) so build/dev work.
- **SVF pillars — exact names, exact order, exact casing:** `Acquire`, `Adopt`, `Retain`, `Expand`. Never reorder, never lowercase in type/enum values.
- **Back-compat is mandatory:** every consumer of `result.solutions` MUST accept BOTH the old flat `Record<productName, string[]>` and the new `SvfSolutionGroup[]`. Old-shape (isFallback / older prompt output) responses must still render exactly as today. `scopeItems` is optional — absent on old responses, in which case scope generation is simply skipped and existing scope content is left untouched.
- **No DB schema migration.** `custom_scope_content` + `scope_content_edited` (migration 001) and `ai_generated_scope_content` (migration 024) already exist in both the staging and prod Supabase projects. Do NOT write a migration. The ONLY cross-environment change is the `ai_prompts` house-voice content (data), which must be applied to BOTH staging and prod (staging before the `main` merge, prod before the `production` promotion) via the `/admin/ai-prompts` edit flow (which auto-creates a revertable version).
- **No emdashes** in any generated or user-facing content (prompt text, HTML copy, exemplar framing). Use a regular dash, "to", or rewrite. This is a hard rule for anything that ships as customer-facing or Ron-voice.
- **House-voice rule (bans in generated scope/deliverables):** active voice as LeanData PS ("LeanData will..."), concrete Salesforce object names over abstractions, and NO AI-tells ("leverage", "robust", "seamless", "utilize", "cutting-edge").

---

## File Structure

**New files:**
- `src/lib/sow/svf-pillars.ts` — `SVF_PILLARS` constant (name + one-line definition) and the shared SVF TypeScript types.
- `src/lib/sow/svf-pillars.test.ts` — asserts pillar order/casing.
- `src/lib/sow/svf-content.ts` — pure builders: flat-or-pillar `solutions` → deliverables HTML/text; `scopeItems` → scope HTML; shared `escapeHtml`.
- `src/lib/sow/svf-content.test.ts` — full both-shapes coverage.
- `src/lib/gemini/svf-contract.ts` — pure `buildSolutionsAndScopeContract(selectedProducts)` returning the JSON-shape + pillar-classification instructions injected into the prompt.
- `src/lib/gemini/svf-contract.test.ts` — asserts the contract text lists all four pillars, every product, and the `scopeItems` key.
- `docs/superpowers/ai-prompts/2026-07-09-transcription-analysis-house-voice.md` — the exact new `ai_prompts` `prompt_content` (voice rules + pillar defs + Ron-approved exemplars), committed for review.

**Modified files:**
- `src/lib/gemini.ts` — reshape `TranscriptionAnalysisResponse.solutions`, add `scopeItems`, inject the SVF contract into `jsonStructure`.
- `src/lib/sow/objectives-content.ts` (+ `.test.ts`) — add `scopeHtml` to `GeneratedObjectives`, add scope triple to `aiGenerationPatch`.
- `src/types/sow.ts`, `src/types/sow-display.ts` — add `ai_generated_scope_content`.
- `src/lib/sow/tab-payloads.ts`, `tab-column-mapping.ts` (+ `.test.ts`), `map-api-response.ts` (+ `.test.ts`), `map-sow-response.ts` — thread `ai_generated_scope_content`.
- `src/components/sow/objectives-wizard/AIGenerationModal.tsx` — build `scopeHtml`, use shared builders, widen `onSuccess`.
- `src/components/sow/objectives-wizard/AiGenerationPanel.tsx` — widen `handleModalSuccess`, forward `scopeHtml`.
- `src/app/preview-sow/page.tsx` — widen `solutions` type + render via shared builder.
- `src/app/api/avoma/transcripts/route.ts` — flatten via shared builder (both shapes).

**Out of scope (documented, not changed):** `DynamicAIResponse.tsx` is a generic recursive key/value renderer (debug surface) that degrades gracefully on either shape; leave it. `ObjectivesEditor.tsx` needs no change — `handleGenerated` already spreads `aiGenerationPatch(gen)`, so it picks up the scope triple automatically once `GeneratedObjectives` carries `scopeHtml`.

---

## Task 1: SVF pillar constant + shared types

**Files:**
- Create: `src/lib/sow/svf-pillars.ts`
- Test: `src/lib/sow/svf-pillars.test.ts`

**Interfaces:**
- Produces: `SVF_PILLARS` (readonly array of `{ name; definition }`), `SvfPillar` (union `'Acquire' | 'Adopt' | 'Retain' | 'Expand'`), `SvfScopeGroup` (`{ pillar: SvfPillar; items: string[] }`), `SvfSolutionGroup` (`{ pillar: SvfPillar; products: Record<string, string[]> }`), `FlatSolutions` (`Record<string, string[]>`), `SolutionsField` (`FlatSolutions | SvfSolutionGroup[]`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sow/svf-pillars.test.ts
import { describe, it, expect } from 'vitest';
import { SVF_PILLARS } from './svf-pillars';

describe('SVF_PILLARS', () => {
  it('lists the four pillars in canonical order and casing', () => {
    expect(SVF_PILLARS.map((p) => p.name)).toEqual([
      'Acquire',
      'Adopt',
      'Retain',
      'Expand',
    ]);
  });

  it('gives every pillar a non-empty one-line definition', () => {
    for (const p of SVF_PILLARS) {
      expect(p.definition.trim().length).toBeGreaterThan(0);
      expect(p.definition).not.toContain('\n');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-pillars`
Expected: FAIL — `Cannot find module './svf-pillars'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sow/svf-pillars.ts

/**
 * The LeanData Solution Value Framework (SVF) pillars. Names and order are
 * canonical and must not change (see docs/superpowers/specs/2026-07-08-ent-structures-design.md).
 * Definitions are embedded into the Gemini prompt so the model classifies
 * scope/deliverables into the right pillar. Voice/exemplar guidance lives in
 * the admin-editable `ai_prompts` row, not here.
 */
export const SVF_PILLARS = [
  { name: 'Acquire', definition: 'Winning new revenue: lead routing and speed-to-lead for net-new pipeline.' },
  { name: 'Adopt', definition: 'Driving product usage and onboarding so customers reach value quickly.' },
  { name: 'Retain', definition: 'Protecting renewals by keeping data, routing, and process healthy.' },
  { name: 'Expand', definition: 'Growing existing accounts through cross-sell, upsell, and new use cases.' },
] as const;

export type SvfPillar = (typeof SVF_PILLARS)[number]['name'];

/** New: in-scope use cases grouped under one pillar. */
export interface SvfScopeGroup {
  pillar: SvfPillar;
  items: string[];
}

/** New (reshaped) solutions: deliverables nested pillar -> product -> items. */
export interface SvfSolutionGroup {
  pillar: SvfPillar;
  products: Record<string, string[]>;
}

/** Legacy flat solutions shape: product name -> deliverable strings. */
export type FlatSolutions = Record<string, string[]>;

/** A solutions field that may be either shape (back-compat). */
export type SolutionsField = FlatSolutions | SvfSolutionGroup[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-pillars`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/lib/sow/svf-pillars.ts src/lib/sow/svf-pillars.test.ts
git commit -m "feat(p4a): add SVF pillar constant and shared solution/scope types"
```

---

## Task 2: Shared SVF content builders (both shapes)

**Files:**
- Create: `src/lib/sow/svf-content.ts`
- Test: `src/lib/sow/svf-content.test.ts`

**Interfaces:**
- Consumes: `SVF_PILLARS`, `SvfScopeGroup`, `SvfSolutionGroup`, `FlatSolutions`, `SolutionsField` from `./svf-pillars`.
- Produces:
  - `escapeHtml(s: unknown): string`
  - `isPillarSolutions(solutions: SolutionsField): solutions is SvfSolutionGroup[]`
  - `solutionsToDeliverablesHtml(solutions: SolutionsField): string`
  - `solutionsToDeliverablesText(solutions: SolutionsField): string[]`
  - `scopeGroupsToHtml(scopeItems: SvfScopeGroup[] | undefined | null): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sow/svf-content.test.ts
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  isPillarSolutions,
  solutionsToDeliverablesHtml,
  solutionsToDeliverablesText,
  scopeGroupsToHtml,
} from './svf-content';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<b>a & "b"</b>')).toBe('&lt;b&gt;a &amp; &quot;b&quot;&lt;/b&gt;');
  });
});

describe('isPillarSolutions', () => {
  it('true for the new array shape, false for the flat object shape', () => {
    expect(isPillarSolutions([{ pillar: 'Acquire', products: {} }])).toBe(true);
    expect(isPillarSolutions({ Routing: ['x'] })).toBe(false);
  });
});

describe('solutionsToDeliverablesHtml', () => {
  it('renders the FLAT shape as h3-per-product + ul (legacy behavior)', () => {
    const html = solutionsToDeliverablesHtml({ Routing: ['Route leads'], BookIt: ['Book meetings'] });
    expect(html).toContain('<h3');
    expect(html).toContain('Routing');
    expect(html).toContain('<li');
    expect(html).toContain('Route leads');
    expect(html).not.toContain('<h4'); // flat shape has no product sub-heading
  });

  it('renders the PILLAR shape as h3-per-pillar + h4-per-product + ul, in SVF order', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Retain', products: { Routing: ['Keep routing healthy'] } },
      { pillar: 'Acquire', products: { BookIt: ['Speed to lead'] } },
    ]);
    // Acquire must render before Retain regardless of input order
    expect(html.indexOf('Acquire')).toBeLessThan(html.indexOf('Retain'));
    expect(html).toContain('<h3');
    expect(html).toContain('<h4');
    expect(html).toContain('BookIt');
    expect(html).toContain('Speed to lead');
  });

  it('skips empty pillars and empty products', () => {
    const html = solutionsToDeliverablesHtml([
      { pillar: 'Acquire', products: { BookIt: [] } },
      { pillar: 'Adopt', products: {} },
    ]);
    expect(html).toBe('');
  });

  it('escapes injected content', () => {
    const html = solutionsToDeliverablesHtml({ '<x>': ['<script>'] });
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('solutionsToDeliverablesText', () => {
  it('flattens the flat shape', () => {
    expect(solutionsToDeliverablesText({ Routing: ['a', 'b'] })).toEqual([
      'Routing:',
      '  • a',
      '  • b',
    ]);
  });

  it('flattens the pillar shape in SVF order with product lines', () => {
    const lines = solutionsToDeliverablesText([
      { pillar: 'Adopt', products: { BookIt: ['x'] } },
      { pillar: 'Acquire', products: { Routing: ['y'] } },
    ]);
    expect(lines[0]).toBe('Acquire');
    expect(lines).toContain('Routing:');
    expect(lines).toContain('  • y');
  });
});

describe('scopeGroupsToHtml', () => {
  it('returns empty string for undefined/empty', () => {
    expect(scopeGroupsToHtml(undefined)).toBe('');
    expect(scopeGroupsToHtml([])).toBe('');
    expect(scopeGroupsToHtml([{ pillar: 'Acquire', items: [] }])).toBe('');
  });

  it('renders pillar-headed lists in SVF order and escapes items', () => {
    const html = scopeGroupsToHtml([
      { pillar: 'Expand', items: ['Grow usage'] },
      { pillar: 'Acquire', items: ['<b>Win</b>'] },
    ]);
    expect(html.indexOf('Acquire')).toBeLessThan(html.indexOf('Expand'));
    expect(html).toContain('&lt;b&gt;Win&lt;/b&gt;');
    expect(html).toContain('<h3');
    expect(html).toContain('<li');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-content`
Expected: FAIL — `Cannot find module './svf-content'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sow/svf-content.ts
import {
  SVF_PILLARS,
  type SvfPillar,
  type SvfScopeGroup,
  type SvfSolutionGroup,
  type SolutionsField,
} from './svf-pillars';

/** Canonical SVF order for a pillar name (used to sort model output). */
const PILLAR_ORDER: Record<SvfPillar, number> = SVF_PILLARS.reduce(
  (acc, p, i) => ({ ...acc, [p.name]: i }),
  {} as Record<SvfPillar, number>
);

/** Escape AI-derived text before interpolating into HTML. Output is derived
 * from untrusted transcripts/docs. (audit #79) */
export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isPillarSolutions(solutions: SolutionsField): solutions is SvfSolutionGroup[] {
  return Array.isArray(solutions);
}

function ulOf(items: string[]): string {
  const lis = items
    .filter((i) => typeof i === 'string' && i.trim().length > 0)
    .map((i) => `<li class="mb-1">${escapeHtml(i)}</li>`)
    .join('');
  return lis ? `<ul class="list-disc pl-6 mb-4">${lis}</ul>` : '';
}

/** Solutions -> deliverables HTML. Accepts BOTH the flat and pillar shapes. */
export function solutionsToDeliverablesHtml(solutions: SolutionsField): string {
  if (!solutions) return '';

  if (isPillarSolutions(solutions)) {
    const groups = [...solutions].sort(
      (a, b) => (PILLAR_ORDER[a.pillar] ?? 99) - (PILLAR_ORDER[b.pillar] ?? 99)
    );
    let html = '';
    for (const g of groups) {
      const productEntries = Object.entries(g.products || {}).filter(
        ([, items]) => Array.isArray(items) && items.some((i) => i?.trim())
      );
      if (productEntries.length === 0) continue;
      html += `<h3 class="text-lg font-semibold mb-3 mt-4">${escapeHtml(g.pillar)}</h3>`;
      for (const [product, items] of productEntries) {
        html += `<h4 class="text-base font-semibold mb-2 mt-3">${escapeHtml(product)}</h4>`;
        html += ulOf(items as string[]);
      }
    }
    return html;
  }

  // Flat shape (legacy): h3-per-product + ul.
  let html = '';
  for (const [product, items] of Object.entries(solutions)) {
    if (!Array.isArray(items) || !items.some((i) => i?.trim())) continue;
    html += `<h3 class="text-lg font-semibold mb-3 mt-4">${escapeHtml(product)}</h3>`;
    html += ulOf(items);
  }
  return html;
}

/** Solutions -> plain-text lines (legacy `deliverables` array). Both shapes. */
export function solutionsToDeliverablesText(solutions: SolutionsField): string[] {
  const out: string[] = [];
  if (!solutions) return out;

  if (isPillarSolutions(solutions)) {
    const groups = [...solutions].sort(
      (a, b) => (PILLAR_ORDER[a.pillar] ?? 99) - (PILLAR_ORDER[b.pillar] ?? 99)
    );
    for (const g of groups) {
      const productEntries = Object.entries(g.products || {}).filter(
        ([, items]) => Array.isArray(items) && items.some((i) => i?.trim())
      );
      if (productEntries.length === 0) continue;
      out.push(g.pillar);
      for (const [product, items] of productEntries) {
        out.push(`${product}:`);
        for (const item of items as string[]) if (item?.trim()) out.push(`  • ${item}`);
      }
    }
    return out;
  }

  for (const [product, items] of Object.entries(solutions)) {
    if (!Array.isArray(items) || !items.some((i) => i?.trim())) continue;
    out.push(`${product}:`);
    for (const item of items) if (item?.trim()) out.push(`  • ${item}`);
  }
  return out;
}

/** scopeItems -> scope HTML (pillar-headed lists in SVF order). */
export function scopeGroupsToHtml(scopeItems: SvfScopeGroup[] | undefined | null): string {
  if (!Array.isArray(scopeItems) || scopeItems.length === 0) return '';
  const groups = [...scopeItems].sort(
    (a, b) => (PILLAR_ORDER[a.pillar] ?? 99) - (PILLAR_ORDER[b.pillar] ?? 99)
  );
  let html = '';
  for (const g of groups) {
    const items = (g.items || []).filter((i) => typeof i === 'string' && i.trim().length > 0);
    if (items.length === 0) continue;
    html += `<h3 class="text-lg font-semibold mb-3 mt-4">${escapeHtml(g.pillar)}</h3>`;
    html += ulOf(items);
  }
  return html;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-content`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/lib/sow/svf-content.ts src/lib/sow/svf-content.test.ts
git commit -m "feat(p4a): shared SVF content builders for deliverables + scope (both shapes)"
```

---

## Task 3: Gemini contract extension (pillar-nested solutions + scopeItems)

**Files:**
- Create: `src/lib/gemini/svf-contract.ts`
- Test: `src/lib/gemini/svf-contract.test.ts`
- Modify: `src/lib/gemini.ts:15-22` (interface), `src/lib/gemini.ts:331-372` (prompt assembly)

**Interfaces:**
- Consumes: `SVF_PILLARS` from `@/lib/sow/svf-pillars`; `SvfScopeGroup`, `SvfSolutionGroup`, `FlatSolutions` types.
- Produces: `buildSolutionsAndScopeContract(selectedProducts: string[]): string` — the JSON-shape example + CRITICAL pillar-classification instructions + pillar definitions, to be embedded in `jsonStructure`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/gemini/svf-contract.test.ts
import { describe, it, expect } from 'vitest';
import { buildSolutionsAndScopeContract } from './svf-contract';

describe('buildSolutionsAndScopeContract', () => {
  it('names all four SVF pillars', () => {
    const s = buildSolutionsAndScopeContract(['Routing', 'BookIt']);
    for (const pillar of ['Acquire', 'Adopt', 'Retain', 'Expand']) {
      expect(s).toContain(pillar);
    }
  });

  it('lists every selected product', () => {
    const s = buildSolutionsAndScopeContract(['Routing', 'BookIt']);
    expect(s).toContain('Routing');
    expect(s).toContain('BookIt');
  });

  it('declares both scopeItems and pillar-nested solutions keys', () => {
    const s = buildSolutionsAndScopeContract(['Routing']);
    expect(s).toContain('"scopeItems"');
    expect(s).toContain('"solutions"');
    expect(s).toContain('"pillar"');
    expect(s).toContain('"products"');
  });

  it('handles no selected products without throwing', () => {
    expect(() => buildSolutionsAndScopeContract([])).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-contract`
Expected: FAIL — `Cannot find module './svf-contract'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/gemini/svf-contract.ts
import { SVF_PILLARS } from '@/lib/sow/svf-pillars';

/**
 * Builds the fixed (code-owned, non-admin-editable) portion of the Gemini
 * prompt that defines the pillar-nested `solutions` and `scopeItems` JSON
 * contract plus SVF pillar classification instructions. Voice rules and
 * exemplars live in the admin-editable `ai_prompts` content, appended after
 * this block by analyzeTranscription().
 */
export function buildSolutionsAndScopeContract(selectedProducts: string[]): string {
  const productList =
    selectedProducts && selectedProducts.length > 0
      ? selectedProducts.map((p) => `"${p}"`).join(', ')
      : '(none selected — infer products discussed in the transcript)';

  const pillarDefs = SVF_PILLARS.map((p) => `- ${p.name}: ${p.definition}`).join('\n');

  // Example uses the first pillar + first product only, to show the shape.
  const exampleProduct = selectedProducts?.[0] || 'productName1';

  return `
The Solution Value Framework (SVF) has exactly four pillars. Classify every
in-scope use case and every deliverable under the single most-relevant pillar:
${pillarDefs}

"scopeItems" is the list of in-scope use cases, grouped by pillar. "solutions"
is the list of concrete deliverables, grouped by pillar and then by product.
Only include a pillar object when it has content. Preserve the order of the
selected products: ${productList}. Do not rename or invent product names beyond
those discussed in the transcript.

The "scopeItems" and "solutions" fields MUST use exactly this structure:
  "scopeItems": [
    { "pillar": "Acquire", "items": ["An in-scope use case for this pillar, as discussed."] }
  ],
  "solutions": [
    {
      "pillar": "Acquire",
      "products": {
        "${exampleProduct}": ["A specific deliverable for this product under this pillar, as discussed."]
      }
    }
  ]`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- svf-contract`
Expected: PASS (4 tests).

- [ ] **Step 5: Update the `TranscriptionAnalysisResponse` interface in `gemini.ts`**

Replace `src/lib/gemini.ts:15-22`:

```ts
import type { SvfScopeGroup, SvfSolutionGroup, FlatSolutions } from '@/lib/sow/svf-pillars';
import { buildSolutionsAndScopeContract } from '@/lib/gemini/svf-contract';

interface TranscriptionAnalysisResponse {
  customerName: string;
  objectiveOverview: string;
  overcomingActions: string[];
  // Back-compat: solutions may be the legacy flat map OR the new pillar array.
  solutions: FlatSolutions | SvfSolutionGroup[];
  // New (optional): in-scope use cases grouped by pillar. Absent on old/fallback responses.
  scopeItems?: SvfScopeGroup[];
  isFallback: boolean;
  error?: string;
}
```

(Place the two `import` lines with the other imports at the top of the file, not inside the interface.)

- [ ] **Step 6: Reshape the prompt in `analyzeTranscription`**

In `src/lib/gemini.ts`, replace the `solutionsTemplate` block (lines 331-343) and the `jsonStructure` `solutions` portion (lines 355-362) so the contract comes from the helper. Concretely, delete the `let solutionsTemplate ...` block (331-343) and change the `jsonStructure` template (345-372) so its body reads:

```ts
    const svfContract = buildSolutionsAndScopeContract(selectedProducts || []);

    const jsonStructure = `
IMPORTANT: You must respond with valid JSON in exactly this format:
{
  "customerName": "${customerName}",
  "objectiveOverview": "A comprehensive paragraph summarizing the customer's primary goals and the overall purpose of the project. This paragraph must explicitly mention the company name from the customerName variable and the LeanData products being implemented.",
  "overcomingActions": [
    "An objective or action we will take to overcome a pain point.",
    "Another objective or action.",
    "A third objective or action."
  ],
  "scopeItems": [],
  "solutions": [],
  "isFallback": false
}

${svfContract}

Input Variables Available:
- customerName: "${customerName}"
- transcription: [Full meeting transcript provided]
- selectedProducts: "${selectedProducts ? selectedProducts.join(', ') : 'None specified'}"
- existingDescription: "${existingDescription || 'None provided'}"
- existingObjectives: "${existingObjectives ? JSON.stringify(existingObjectives) : 'None provided'}"
- supportingDocuments: "${supportingDocuments || 'None provided'}"

The response must be valid JSON. Do not include any text before or after the JSON.`;
```

Leave `contentGuidance` (the DB prompt), the untrusted-transcript delimiting, and `executePrompt` unchanged. `executePrompt` still does a bare `parsed as TranscriptionAnalysisResponse` with no schema validation — that is intentional and preserves back-compat (an older prompt version that returns the flat shape still parses and renders via the Task 2 builders).

- [ ] **Step 7: Verify build + full test suite**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test && npm run build`
Expected: PASS + successful build (the interface change compiles; consumers updated in later tasks still accept both shapes because the union widens, not narrows). If `npm run build` surfaces a type error at a `solutions` consumer, that consumer is handled in Task 6/7 — if the error blocks the build here, apply that task's consumer edit now and note it.

- [ ] **Step 8: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/lib/gemini/svf-contract.ts src/lib/gemini/svf-contract.test.ts src/lib/gemini.ts
git commit -m "feat(p4a): extend Gemini contract with SVF pillar-nested solutions + scopeItems"
```

---

## Task 4: Scope fan-out in `aiGenerationPatch`

**Files:**
- Modify: `src/lib/sow/objectives-content.ts:10-16` (interface), `:66-86` (patch)
- Test: `src/lib/sow/objectives-content.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GeneratedObjectives` gains `scopeHtml: string`; `aiGenerationPatch` emits `custom_scope_content`, `ai_generated_scope_content`, `scope_content_edited: false`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/sow/objectives-content.test.ts`:

```ts
import { aiGenerationPatch } from './objectives-content';

describe('aiGenerationPatch — scope', () => {
  it('fans scopeHtml out to the custom/ai_generated/edited triple', () => {
    const patch = aiGenerationPatch({
      overview: 'o',
      keyObjectivesHtml: '<ul></ul>',
      deliverablesHtml: '<h3></h3>',
      keyObjectives: [],
      deliverables: [],
      scopeHtml: '<h3>Acquire</h3><ul><li>x</li></ul>',
    });
    expect(patch.custom_scope_content).toBe('<h3>Acquire</h3><ul><li>x</li></ul>');
    expect(patch.ai_generated_scope_content).toBe('<h3>Acquire</h3><ul><li>x</li></ul>');
    expect(patch.scope_content_edited).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- objectives-content`
Expected: FAIL — TypeScript/`scopeHtml` missing on the argument type, or `custom_scope_content` undefined.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/sow/objectives-content.ts`, add `scopeHtml` to the interface (after `deliverables`, line 15):

```ts
export interface GeneratedObjectives {
  overview: string;
  keyObjectivesHtml: string;
  deliverablesHtml: string;
  keyObjectives: string[];
  deliverables: string[];
  scopeHtml: string;
}
```

And add the scope triple inside `aiGenerationPatch` (before the `// Legacy deliverables array` block, line 83):

```ts
    // Scope (SVF pillar-organized, generated alongside deliverables)
    custom_scope_content: gen.scopeHtml,
    ai_generated_scope_content: gen.scopeHtml,
    scope_content_edited: false,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- objectives-content`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/lib/sow/objectives-content.ts src/lib/sow/objectives-content.test.ts
git commit -m "feat(p4a): fan generated scope HTML through aiGenerationPatch"
```

---

## Task 5: Thread `ai_generated_scope_content` through types + mappers

**Files:**
- Modify: `src/types/sow.ts`, `src/types/sow-display.ts`, `src/lib/sow/tab-payloads.ts`, `src/lib/sow/tab-column-mapping.ts`, `src/lib/sow/map-api-response.ts`, `src/lib/sow/map-sow-response.ts`
- Test: `src/lib/sow/map-api-response.test.ts`, `src/lib/sow/tab-column-mapping.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ai_generated_scope_content` present in the SOW type and round-tripped by all mappers alongside the three objectives baselines.

- [ ] **Step 1: Locate the exact sites to mirror**

Run: `cd ~/GitHub/SOW-Generator-p4a && grep -rn "ai_generated_deliverables_content" src/types/sow.ts src/types/sow-display.ts src/lib/sow/tab-payloads.ts src/lib/sow/tab-column-mapping.ts src/lib/sow/map-api-response.ts src/lib/sow/map-sow-response.ts`
Expected: one hit per file. `ai_generated_scope_content` must be added right beside each hit (it is currently absent from all of them).

- [ ] **Step 2: Write the failing test**

Add to `src/lib/sow/map-api-response.test.ts` (mirror the existing objectives-baseline assertions in that file):

```ts
it('maps ai_generated_scope_content through', () => {
  const apiRow = { ai_generated_scope_content: '<h3>Acquire</h3>' } as Record<string, unknown>;
  const mapped = mapApiResponseToSOWData(apiRow as never); // use the file's actual exported mapper name
  expect((mapped as Record<string, unknown>).ai_generated_scope_content).toBe('<h3>Acquire</h3>');
});
```

Note: use the mapper function actually exported by `map-api-response.ts` (check the file's existing imports in the test). If the test file constructs a full fixture row, extend that fixture with `ai_generated_scope_content` and assert it survives instead of adding a fresh minimal row.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test -- map-api-response`
Expected: FAIL — mapped value is `undefined` (field not threaded yet).

- [ ] **Step 4: Add the field in all six files**

In each file, beside the existing `ai_generated_deliverables_content` reference, add the scope sibling. Exact edits:

- `src/types/sow.ts` — after `ai_generated_deliverables_content?: string;` add:
  ```ts
  ai_generated_scope_content?: string;
  ```
- `src/types/sow-display.ts` — same addition beside its `ai_generated_deliverables_content` field.
- `src/lib/sow/tab-payloads.ts` — in the payload object that lists `ai_generated_deliverables_content`, add `ai_generated_scope_content` reading from the same source object (mirror the exact access pattern used on the adjacent line, e.g. `ai_generated_scope_content: formData.ai_generated_scope_content,`).
- `src/lib/sow/tab-column-mapping.ts` — add `ai_generated_scope_content` to the same mapping list/allowlist as the deliverables baseline.
- `src/lib/sow/map-api-response.ts` — add the field to the mapped output beside the deliverables baseline.
- `src/lib/sow/map-sow-response.ts` — same.

Read each adjacent line first and copy its exact shape; these files use slightly different idioms (object spread vs. explicit assignment vs. column allowlist array).

- [ ] **Step 5: Run test + full suite + build**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test && npm run build`
Expected: PASS + build success.

- [ ] **Step 6: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/types/sow.ts src/types/sow-display.ts src/lib/sow/tab-payloads.ts src/lib/sow/tab-column-mapping.ts src/lib/sow/map-api-response.ts src/lib/sow/map-sow-response.ts src/lib/sow/map-api-response.test.ts
git commit -m "feat(p4a): thread ai_generated_scope_content through types and mappers"
```

---

## Task 6: Wire scope + shared builders through the AI modal and panel

**Files:**
- Modify: `src/components/sow/objectives-wizard/AIGenerationModal.tsx:9-15` (prop), `:162-201` (builders + onSuccess)
- Modify: `src/components/sow/objectives-wizard/AiGenerationPanel.tsx:185-204` (handleModalSuccess)

**Interfaces:**
- Consumes: `solutionsToDeliverablesHtml`, `solutionsToDeliverablesText`, `scopeGroupsToHtml` from `@/lib/sow/svf-content`.
- Produces: `onSuccess`/`handleModalSuccess`/`onGenerated` payloads carry `scopeHtml: string`; `ObjectivesEditor.handleGenerated` (unchanged) forwards it via `aiGenerationPatch`.

- [ ] **Step 1: Widen the modal `onSuccess` prop type**

In `AIGenerationModal.tsx:9-15`, add `scopeHtml`:

```ts
  onSuccess: (generatedObjectives: {
    overview: string;
    keyObjectives: string[];
    deliverables: string[];
    keyObjectivesHtml?: string;
    deliverablesHtml?: string;
    scopeHtml?: string;
  }) => void;
```

- [ ] **Step 2: Replace the inline builders with the shared helpers**

At the top of `AIGenerationModal.tsx`, add:

```ts
import {
  solutionsToDeliverablesHtml,
  solutionsToDeliverablesText,
  scopeGroupsToHtml,
} from '@/lib/sow/svf-content';
```

Replace the inline `esc`/`deliverablesHtml`/`deliverables` blocks (`AIGenerationModal.tsx:152-188`) with:

```ts
      // Deliverables + scope HTML come from shared builders that accept BOTH
      // the legacy flat solutions map and the new SVF pillar array. (P4a)
      const deliverablesHtml = solutionsToDeliverablesHtml(result.solutions);
      const deliverables = solutionsToDeliverablesText(result.solutions);
      const scopeHtml = scopeGroupsToHtml(result.scopeItems);
```

Keep the `painPoints` / `keyObjectivesHtml` logic as-is, but replace its inline `esc(...)` usage by importing `escapeHtml` from the same module and calling it (the module now owns escaping):

```ts
import { escapeHtml } from '@/lib/sow/svf-content';
// ...
      const keyObjectivesHtml = painPoints.length > 0
        ? `<ul class="list-disc pl-6 mb-4">${painPoints.map((obj) => `<li class="mb-1">${escapeHtml(obj)}</li>`).join('')}</ul>`
        : '';
```

- [ ] **Step 3: Add `scopeHtml` to the modal `onSuccess` call**

`AIGenerationModal.tsx:195-201`:

```ts
      onSuccess({
        overview: result.objectiveOverview || '',
        keyObjectives: painPoints,
        deliverables: deliverables,
        keyObjectivesHtml: keyObjectivesHtml,
        deliverablesHtml: deliverablesHtml,
        scopeHtml: scopeHtml,
      });
```

- [ ] **Step 4: Forward `scopeHtml` through the panel**

`AiGenerationPanel.tsx:185-204` — widen the input type and pass `scopeHtml` (defaulting to `''`, since `GeneratedObjectives.scopeHtml` is required):

```ts
  const handleModalSuccess = useCallback(
    (generated: {
      overview: string;
      keyObjectives: string[];
      deliverables: string[];
      keyObjectivesHtml?: string;
      deliverablesHtml?: string;
      scopeHtml?: string;
    }) => {
      onGenerated({
        overview: generated.overview,
        keyObjectivesHtml: generated.keyObjectivesHtml || '',
        deliverablesHtml: generated.deliverablesHtml || '',
        keyObjectives: generated.keyObjectives,
        deliverables: generated.deliverables,
        scopeHtml: generated.scopeHtml || '',
      });
      setIsModalOpen(false);
      setIsExpanded(false);
    },
    [onGenerated]
  );
```

`ObjectivesEditor.handleGenerated` needs NO change: it spreads `aiGenerationPatch(gen)`, which now writes the scope triple, so generated scope lands in `custom_scope_content` and is immediately editable in the Content tab.

- [ ] **Step 5: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test && npm run build`
Expected: PASS + build success. If any other file imported the now-removed local `esc` from the modal, update it to import `escapeHtml` from `@/lib/sow/svf-content` (grep: `grep -rn "esc(" src/components/sow/objectives-wizard/AIGenerationModal.tsx`).

- [ ] **Step 6: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/components/sow/objectives-wizard/AIGenerationModal.tsx src/components/sow/objectives-wizard/AiGenerationPanel.tsx
git commit -m "feat(p4a): generate SVF scope + pillar deliverables through the AI modal"
```

---

## Task 7: Back-compat the other `solutions` consumers (preview page + Avoma route)

**Files:**
- Modify: `src/app/preview-sow/page.tsx:26-28` (type), `:502-520` (render)
- Modify: `src/app/api/avoma/transcripts/route.ts:~95` (flatMap)

**Interfaces:**
- Consumes: `solutionsToDeliverablesHtml`, `solutionsToDeliverablesText` from `@/lib/sow/svf-content`; `SolutionsField` type from `@/lib/sow/svf-pillars`.

- [ ] **Step 1: Read the current preview render + Avoma flatMap**

Run:
```bash
cd ~/GitHub/SOW-Generator-p4a
sed -n '20,32p;495,522p' src/app/preview-sow/page.tsx
sed -n '85,110p' src/app/api/avoma/transcripts/route.ts
```
Confirm the current shapes before editing.

- [ ] **Step 2: Widen the preview `solutions` type**

`src/app/preview-sow/page.tsx:28` — change:
```ts
  solutions: Record<string, string[]>;
```
to:
```ts
  solutions: import('@/lib/sow/svf-pillars').SolutionsField;
```
(or add a top-of-file `import type { SolutionsField } from '@/lib/sow/svf-pillars';` and use `solutions: SolutionsField;`).

- [ ] **Step 3: Render via the shared builder**

Replace the `Object.entries(previewResult.solutions).map(...)` block (`preview-sow/page.tsx:502-520`) with a single dangerouslySetInnerHTML fed by the shared builder, matching how the modal renders:

```tsx
import { solutionsToDeliverablesHtml } from '@/lib/sow/svf-content';
import { sanitizeHtml } from '@/lib/sanitize-html'; // use the same sanitizer the wizard uses; grep for the existing import
// ...
{previewResult.solutions && (
  <div
    className="prose max-w-none dark:prose-invert"
    dangerouslySetInnerHTML={{
      __html: sanitizeHtml(solutionsToDeliverablesHtml(previewResult.solutions)),
    }}
  />
)}
```

Check the existing sanitizer import path used elsewhere in the wizard (`grep -rn "sanitizeHtml" src/components/sow/objectives-wizard/`) and reuse it; do NOT inject unsanitized builder output on a page. If the surrounding markup already sits inside a card/heading, keep that chrome and only swap the inner list-rendering.

- [ ] **Step 4: Back-compat the Avoma flatMap**

`src/app/api/avoma/transcripts/route.ts:~95` — replace the `Object.entries(analysisResult.solutions).flatMap(...)` that assumes a flat array with the shared text builder:

```ts
import { solutionsToDeliverablesText } from '@/lib/sow/svf-content';
// ...
const deliverableLines = solutionsToDeliverablesText(analysisResult.solutions);
```
Then use `deliverableLines` wherever the old flattened array was consumed (it returns `string[]`, same as before). Read the surrounding usage to keep the downstream shape identical.

- [ ] **Step 5: Verify build + suite**

Run: `cd ~/GitHub/SOW-Generator-p4a && npm test && npm run build`
Expected: PASS + build success.

- [ ] **Step 6: Commit**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add src/app/preview-sow/page.tsx src/app/api/avoma/transcripts/route.ts
git commit -m "feat(p4a): render both solutions shapes on preview + avoma passthrough"
```

---

## Task 8: House-voice `ai_prompts` content (exemplar sourcing + reseed)

This task is DATA plus a human checkpoint, not application code. It produces the new `ai_prompts.prompt_content` and applies it to both DBs.

**Files:**
- Create: `docs/superpowers/ai-prompts/2026-07-09-transcription-analysis-house-voice.md` (the exact prompt text, committed for review)

- [ ] **Step 1: Source exemplars from Google Drive**

Locate the four LeanData-paper SOWs named in `docs/superpowers/specs/2026-07-04-ent-readiness-and-simplification-assessment.md:195` via Google Drive: **Veeam Buying Groups 2024**, **CDW Orchestration 2026 (phased)**, **ZoomInfo BookIt 1Mind**, **RL Polk (executed Dec 2025)**. Extract the target scope passages the design calls out: Veeam buying-groups scope, CDW GTM-phased scope, RL Polk SLA scope. Capture 2-3 short passages (2-4 sentences each) that best exemplify the house voice.

- [ ] **Step 2: CHECKPOINT — Ron pre-approves the raw excerpts**

Present the raw excerpts to Ron for sign-off BEFORE writing them into the prompt (per his decision). Do not proceed to Step 3 until approved. If Ron edits or swaps passages, use his versions.

- [ ] **Step 3: Write the new prompt content into the repo**

Create `docs/superpowers/ai-prompts/2026-07-09-transcription-analysis-house-voice.md` containing the full replacement `prompt_content` for the active `Transcription Analysis` `ai_prompts` row. The content is content/voice guidance only — NO JSON structure, NO placeholders (the code owns the JSON contract and interpolates data; `gemini.ts` appends this text as-is). Structure it as three sections:

1. **Voice rules** (verbatim, no emdashes): "Write as LeanData Professional Services in the first person plural or as 'LeanData will...'. Use active voice. Name concrete Salesforce objects (Lead, Contact, Account, Opportunity, Campaign Member) rather than abstractions. Do not use the words leverage, robust, seamless, utilize, or cutting-edge. Keep each item to one concrete, verifiable action."
2. **SVF classification guidance** — restate the four pillars and how to decide which pillar a use case or deliverable belongs to (reinforces the code-side definitions with examples: e.g. speed-to-lead routing -> Acquire; onboarding a new BookIt flow -> Adopt; a data-hygiene or renewal-protecting cleanup -> Retain; a new cross-sell use case on an existing tenant -> Expand).
3. **Exemplars** — the 2-3 Ron-approved passages, each labeled with its source and the pillar it illustrates, framed as "Match this voice and specificity:".

- [ ] **Step 4: Commit the prompt doc**

```bash
cd ~/GitHub/SOW-Generator-p4a
git add docs/superpowers/ai-prompts/2026-07-09-transcription-analysis-house-voice.md
git commit -m "docs(p4a): house-voice transcription-analysis prompt content for review"
```

- [ ] **Step 5: Apply to the STAGING Supabase project as a new version**

In the STAGING environment's `/admin/ai-prompts` UI, edit the active `Transcription Analysis` prompt and paste the new `prompt_content` from the committed doc, with a `change_reason` of "P4a: SVF pillars + house voice". Saving auto-creates a new `is_current` version and leaves the prior version revertable. (Do this on staging BEFORE merging the code PR to `main`, so the moment staging deploys, generation uses the new voice.) Confirm the version bumped in the Version History modal.

---

## Task 9: Staging verification against a real Aera transcript

- [ ] **Step 1: Open the PR and merge to `main` (staging)**

```bash
cd ~/GitHub/SOW-Generator-p4a
git push origin feature/p4a-svf-house-voice
gh pr create --repo ronfeathers-LD/SOW-Generator --base main \
  --title "P4a: SVF + house-voice AI scope generation" \
  --body "Extends the Gemini contract with SVF pillar-nested solutions + scopeItems, generates a pillar-organized Scope section in the LeanData house voice, and keeps full back-compat with the old flat solutions shape. Prompt content applied to staging + prod ai_prompts. Design: docs/superpowers/specs/2026-07-08-ent-structures-design.md §P4a."
```
Wait for CI green + review, then merge to `main`. Staging auto-deploys.

- [ ] **Step 2: Find a real Aera transcript**

Locate a recent Aera meeting transcript via LUCI/Avoma (Avoma `list_meetings` filtered to Aera attendees, then `get_meeting_transcript`). Use it as the generation input.

- [ ] **Step 3: Run generation on staging**

In staging, create/open a SOW for Aera, run the AI generation with the Aera transcript, and inspect the generated Deliverables and the new Scope section.

- [ ] **Step 4: CHECKPOINT — acceptance bar (Ron/PS eyeball)**

Verify against the design's acceptance bar:
- Scope and Deliverables are organized under the correct SVF pillars (Acquire/Adopt/Retain/Expand, only pillars with content shown).
- Copy reads in the LeanData house voice (matches the exemplars; no banned AI-tells; concrete SF objects; no emdashes).
- Scope landed in the Content tab and is editable (TipTap), with the "Customized" badge appearing only after a manual edit.
- Confirm a back-compat spot check: an older SOW / fallback response (flat `solutions`) still renders deliverables exactly as before.

Present the staging output to Ron/PS for sign-off. Do NOT promote until approved. If the voice is off, tune the `ai_prompts` content on staging (revertable) and re-run — no code change needed.

---

## Task 10: Promote to production

- [ ] **Step 1: Apply the prompt content to the PROD Supabase project**

Before promoting, apply the identical new `prompt_content` in PRODUCTION's `/admin/ai-prompts` (same edit-as-new-version flow, same `change_reason`). This must happen BEFORE the code reaches production so the first prod generation uses the new voice.

- [ ] **Step 2: Open the promotion PR `main` → `production`**

```bash
cd ~/GitHub/SOW-Generator-p4a
gh pr create --repo ronfeathers-LD/SOW-Generator --base production --head main \
  --title "Deploy: P4a SVF + house-voice AI scope generation" \
  --body "Promotes P4a. ai_prompts house-voice content already applied to prod. No schema migration (scope columns pre-exist)."
```
Follow the SOW-Generator promotion norm used for P4c/P4d (merge commit, wait for the `main`-tip CI to be green). Merge to trigger the prod deploy.

- [ ] **Step 3: Verify prod**

Run one generation in prod against a known transcript; confirm pillar-organized, house-voice scope + deliverables render and that an old flat-shape SOW still renders. Clean up the worktree once merged:
```bash
git worktree remove ~/GitHub/SOW-Generator-p4a
```

---

## Self-Review

**Spec coverage (design §P4a):**
- a1 contract extension (pillar-nested `solutions` + `scopeItems` + `SVF_PILLARS` constant with definitions, back-compat flat shape) → Tasks 1, 3.
- a2 output landing (deliverables HTML `<h3>`pillar/`<h4>`product/`<ul>`; scope generation into `custom_scope_content` + `ai_generated_scope_content` + `scope_content_edited: false` via the fan-out; Content-tab editable; PDF/print unchanged) → Tasks 2, 4, 5, 6. (Design also mentions a collapsed-summary "…, scope" note; Agent mapping found no such per-field summary UI exists on `origin/main` — the panel just collapses on success — so there is nothing to extend and it is intentionally omitted. Flagged for Ron.)
- a3 house voice (rewrite active `ai_prompts` content with voice rules + 2-3 mined exemplars + pillar defs; ship prompt text in `docs/`; seed as revertable new version; PS tunes without deploy) → Task 8.
- Acceptance bar (Aera staging fixture; eyeball vs exemplars; Ron/PS sign-off before promote) → Task 9.
- Migration reminder (both DBs, staging before merge, prod before promotion) → Tasks 8 (staging), 10 (prod). Confirmed NO schema migration needed; only ai_prompts data.
- Test surface (SVF response parsing/back-compat mapping; aiGenerationPatch extension for scope) → Tasks 2, 3, 4, 5.

**Placeholder scan:** No "TBD"/"handle edge cases" left. The one deferred-content slot (Task 8 exemplar passages) is a genuine human checkpoint (Ron pre-approval + Drive sourcing), not a code placeholder; the voice rules and pillar guidance around it are fully specified.

**Type consistency:** `SolutionsField` / `SvfSolutionGroup` / `SvfScopeGroup` / `FlatSolutions` defined in Task 1 are used identically in Tasks 2, 3, 6, 7. `GeneratedObjectives.scopeHtml` (Task 4) matches the `scopeHtml` produced by the modal/panel (Task 6). Builder names (`solutionsToDeliverablesHtml`, `solutionsToDeliverablesText`, `scopeGroupsToHtml`, `escapeHtml`, `isPillarSolutions`) are consistent across Tasks 2, 6, 7.

**Open flags for Ron (non-blocking):**
- The design's "collapsed summary: 'Generated: overview, objectives, deliverables, scope.'" has no existing UI on `origin/main` to extend. Omitted; can add a small summary chip later if wanted.
- `DynamicAIResponse.tsx` (generic debug renderer) left unchanged — it degrades gracefully on either shape.
