# P4d Punch-List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ryan's questionnaire punch-list — category-driven product groups (unblocks "Integrations"), two new standard client roles, and named SFDC tenants on the SOW.

**Architecture:** Three independent tasks. Product grouping becomes data-driven from the `product_categories` table via a new pure helper. Roles are a constant append. Tenant names are a new nullable column mirrored through the exact same wiring as the existing `salesforce_tenants` field.

**Tech Stack:** Next.js 15 / TypeScript / Supabase / Vitest. Spec: `docs/superpowers/specs/2026-07-08-ent-structures-design.md` §P4d.

## Global Constraints

- Tests are Vitest, co-located `src/**/*.test.ts` — NEVER `__tests__/` directories (vitest.config excludes them; a test there silently never runs).
- `npm test` (currently 316 passing) and `npm run build` must both pass at the end of every task.
- Never commit `next-env.d.ts`.
- Migration files: idempotent (`ADD COLUMN IF NOT EXISTS`); migration is APPLIED manually later by the controller — do not attempt to run it against any DB.
- Dark-mode: any new UI must carry `dark:` classes matching its surroundings.
- Do not remove or rename the existing `salesforce_tenants` field or its validation.

---

### Task 1: Category-driven product groups

**Files:**
- Create: `src/lib/sow/product-groups.ts`
- Create: `src/lib/sow/product-groups.test.ts`
- Modify: `src/components/sow/ProjectOverviewTab.tsx` (grouping fn ~lines 191-216, render usage ~line 565, plus a categories fetch)

**Interfaces:**
- Produces: `groupProductsByCategory(products, categories)` → `Array<{ key: string; title: string; icon: string; color: 'blue'|'green'|'gray'; products: Product[] }>`

**Context:** `ProjectOverviewTab.tsx` hardcodes three buckets (`FlowBuilder`/`BookIt`/`Other`) in a local `groupProducts()`; any product whose `category` is anything else silently never renders. Categories already live in the `product_categories` table (columns include `name`, `is_active`, `sort_order`), served by `GET /api/admin/product-categories` (no admin gate on GET; returns active categories ordered by `sort_order`). The render maps groups to a header (icon + colored title) and a card grid; `colorClasses` in the JSX supports exactly `blue|green|gray`.

- [ ] **Step 1: Write the failing test** — `src/lib/sow/product-groups.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { groupProductsByCategory, type CategoryRow, type GroupableProduct } from './product-groups';

const p = (name: string, category: string): GroupableProduct =>
  ({ id: name, name, category, is_active: true, sort_order: 0 });
const c = (name: string, sort: number): CategoryRow => ({ name, sort_order: sort, is_active: true });

describe('groupProductsByCategory', () => {
  it('orders groups by category sort_order and keeps known meta', () => {
    const groups = groupProductsByCategory(
      [p('Router', 'FlowBuilder'), p('Forms', 'BookIt')],
      [c('BookIt', 1), c('FlowBuilder', 2)]
    );
    expect(groups.map(g => g.key)).toEqual(['BookIt', 'FlowBuilder']);
    expect(groups[0].title).toBe('BookIt Family');
    expect(groups[0].color).toBe('green');
    expect(groups[1].icon).toBe('⚡');
  });

  it('renders unknown categories with fallback meta (fixes silent drop)', () => {
    const groups = groupProductsByCategory(
      [p('Usergems Sync', 'Integrations')],
      [c('Integrations', 5)]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'Integrations', title: 'Integrations', color: 'gray', icon: '🧩' });
    expect(groups[0].products.map(x => x.name)).toEqual(['Usergems Sync']);
  });

  it('omits empty groups and groups products of categories missing from the table under their own name', () => {
    const groups = groupProductsByCategory(
      [p('Router', 'FlowBuilder'), p('Mystery', 'Uncatalogued')],
      [c('FlowBuilder', 1), c('BookIt', 2)]
    );
    expect(groups.map(g => g.key)).toEqual(['FlowBuilder', 'Uncatalogued']);
  });

  it('falls back to legacy three-bucket order when categories fetch is empty', () => {
    const groups = groupProductsByCategory(
      [p('X', 'Other'), p('Router', 'FlowBuilder')],
      []
    );
    expect(groups.map(g => g.key)).toEqual(['FlowBuilder', 'Other']);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- product-groups` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/lib/sow/product-groups.ts`:

```typescript
export interface GroupableProduct {
  id: string; name: string; category: string; is_active: boolean; sort_order: number;
}
export interface CategoryRow { name: string; sort_order: number; is_active: boolean }
export interface ProductGroup {
  key: string; title: string; icon: string; color: 'blue' | 'green' | 'gray';
  products: GroupableProduct[];
}

const KNOWN_META: Record<string, Omit<ProductGroup, 'key' | 'products'>> = {
  FlowBuilder: { title: 'FlowBuilder & Orchestration', icon: '⚡', color: 'blue' },
  BookIt: { title: 'BookIt Family', icon: '📋', color: 'green' },
  Other: { title: 'Other Products', icon: '🔧', color: 'gray' },
};
const FALLBACK_ORDER = ['FlowBuilder', 'BookIt', 'Other'];

export function groupProductsByCategory(
  products: GroupableProduct[],
  categories: CategoryRow[],
): ProductGroup[] {
  const orderedNames = categories.length
    ? categories.map(c => c.name)
    : FALLBACK_ORDER;
  // Categories not in the table (or legacy values) still render, after the known ones.
  const extras = [...new Set(products.map(p => p.category))].filter(n => !orderedNames.includes(n));
  return [...orderedNames, ...extras]
    .map(name => ({
      key: name,
      ...(KNOWN_META[name] ?? { title: name, icon: '🧩', color: 'gray' as const }),
      products: products.filter(p => p.category === name),
    }))
    .filter(g => g.products.length > 0);
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- product-groups` → 4 passing.

- [ ] **Step 5: Wire the tab.** In `ProjectOverviewTab.tsx`:
  - Add categories state + fetch alongside the existing products fetch (same useEffect):
    ```typescript
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    // inside fetchProducts' try, after products:
    const catRes = await fetch('/api/admin/product-categories');
    if (catRes.ok) setCategories(await catRes.json());
    ```
    (A failed categories fetch leaves `[]` → helper's legacy fallback; do not block products on it.)
  - Delete the local `groupProducts` function; import `groupProductsByCategory` (and types) from `@/lib/sow/product-groups`.
  - At the render site (~line 565) replace `groupProducts(products).map(([groupKey, group]) => (` with `groupProductsByCategory(products, categories).map((group) => (` and use `group.key` where `groupKey` was used. The existing `colorClasses[group.color]` JSX works unchanged (helper only emits blue/green/gray).
  - `getUnitFieldName`/validation are untouched — products in new categories have `requires_units` false unless admin sets it, in which case they take the `isOtherProduct` path only if category === 'Other'; new-category products with `requires_units` fall through to `null` (acceptable: spec says generic path is 'other_products_units' only for category Other; note this limitation in a code comment at `getUnitFieldName`).

- [ ] **Step 6: Full gates** — `npm test` (316 + 4) and `npm run build` → pass.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(products): drive product groups from product_categories table"`

### Task 2: Standard client roles +2

**Files:**
- Modify: `src/lib/sow/standard-client-roles.ts` (append two entries)
- Modify: `src/lib/sow/standard-client-roles.test.ts` (update counts/expectations)

**Interfaces:** none new — `STANDARD_CLIENT_ROLES` grows 5 → 7; `mergeStandardClientRoles` unchanged.

- [ ] **Step 1: Update the test** — wherever the existing test asserts the seeded role list/length, extend to 7 and add:

```typescript
it('includes the scheduling-project roles', () => {
  const names = STANDARD_CLIENT_ROLES.map(r => r.role);
  expect(names).toContain('MAP Administrator');
  expect(names).toContain('Web Developer');
  expect(names.indexOf('MAP Administrator')).toBeGreaterThan(names.indexOf('SFDC System Team Point of Contact'));
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- standard-client-roles` → FAIL.

- [ ] **Step 3: Implement** — append after the existing fifth entry, matching the array's existing object shape exactly (same keys as siblings — copy a sibling and edit):

```typescript
  {
    role: 'MAP Administrator',
    name: '',
    email: '',
    responsibilities: 'Administers the marketing automation platform; owns form and webhook changes needed for scheduling flows.',
  },
  {
    role: 'Web Developer',
    name: '',
    email: '',
    responsibilities: 'Implements website-side changes (forms, scripts, routing snippets) required for scheduling deployments.',
  },
```

(If the real objects carry additional keys — e.g. `contact_title` — mirror the siblings verbatim.)

- [ ] **Step 4: Run to verify pass**, then full gates: `npm test`, `npm run build`.

- [ ] **Step 5: Commit** — `git commit -am "feat(sow): add MAP Administrator and Web Developer to standard client roles"`

### Task 3: SFDC tenant names

**Files:**
- Create: `supabase/migrations/036_add_salesforce_tenant_names.sql`
- Modify: every `salesforce_tenants` touchpoint that carries the VALUE (mirror pattern; enumerated below)
- Test: `src/lib/sow/map-sow-response.test.ts` (extend existing suite)

**Interfaces:**
- Produces: `sows.salesforce_tenant_names TEXT` ↔ `formData.template.salesforce_tenant_names` (string, optional).

**Context:** `salesforce_tenants` is a count entered on the Project Overview tab and rendered as a line on objectives/full/print/PDF outputs. Tenant NAMES are a new free-text sibling ("Prod; UAT sandbox 'uat2'; Dev"). **Method:** `git grep -n "salesforce_tenants" src/` and mirror each VALUE-carrying site. Do NOT mirror into: `pre-submit-checks` (count validation stays count-only), `validation-utils`, `section-status`, `review.ts` (completeness rules unchanged — names are optional and never required).

- [ ] **Step 1: Migration** — `supabase/migrations/036_add_salesforce_tenant_names.sql`:

```sql
-- Named SFDC tenants/sandboxes for the SOW (free text; count lives in salesforce_tenants)
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_tenant_names TEXT;
```

- [ ] **Step 2: Write the failing test** — in `src/lib/sow/map-sow-response.test.ts`, alongside the existing `salesforce_tenants` passthrough case:

```typescript
it('passes salesforce_tenant_names through to the template', () => {
  const mapped = mapSowResponse(makeApiRow({ salesforce_tenant_names: "Prod; UAT 'uat2'" }));
  expect(mapped.template.salesforce_tenant_names).toBe("Prod; UAT 'uat2'");
});

it('defaults missing salesforce_tenant_names to empty string', () => {
  const mapped = mapSowResponse(makeApiRow({ salesforce_tenant_names: null }));
  expect(mapped.template.salesforce_tenant_names).toBe('');
});
```

(Adapt `makeApiRow`/`mapSowResponse` names to the file's existing fixtures — follow how the `salesforce_tenants` case is written and mirror it.)

- [ ] **Step 3: Run to verify failure**, then **Step 4: wire the field** — mirror `salesforce_tenants` at each VALUE site:
  - `src/types/sow.ts` + `src/types/sow-display.ts`: add `salesforce_tenant_names?: string` beside the sibling.
  - `src/lib/sow/map-sow-response.ts` + `map-api-response-to-display.ts`: passthrough with `|| ''` default.
  - `src/lib/sow/tab-payloads.ts` + `tab-column-mapping.ts`: add to the Project Overview tab's payload/column map beside the sibling.
  - `src/app/api/sow/route.ts` (POST insert) and the PUT/PATCH allowlist that carries `salesforce_tenants`: add the column.
  - `src/components/SOWForm.tsx` + `src/app/sow/new/page.tsx`: default `''` in initial template state.
  - `src/components/sow/ProjectOverviewTab.tsx`: below the Salesforce Tenants input (same grid cell), add:
    ```tsx
    <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">Tenant Names</label>
    <Input
      type="text"
      value={formData.template?.salesforce_tenant_names || ''}
      onChange={(e) => setFormData({
        ...formData,
        template: { ...formData.template!, salesforce_tenant_names: e.target.value || '' }
      })}
      placeholder="e.g. Prod; UAT sandbox 'uat2'; Dev"
    />
    <p className="mt-1 text-xs text-gray-500">Name each tenant/sandbox in scope</p>
    ```
    (Match the file's existing label/dark-mode classes — copy the sibling's exact classes.)
  - Renders — beneath the existing tenants line in each: `src/components/sow/SOWObjectivesPage.tsx` (~line 189), `SOWFullView.tsx`, `SOWPrintView.tsx`, and `src/lib/pdf-generator.ts` (~line 1113 `<li>Salesforce Tenants: …`), plus the PDF route passthrough `src/app/api/sow/[id]/pdf/route.ts`. Render pattern (conditional — only when non-empty):
    ```tsx
    {sow.salesforce_tenant_names && (
      <li>Tenant Names: {sow.salesforce_tenant_names}</li>
    )}
    ```
    (Adapt element/prop naming per surface; PDF is a template-string mirror.)
  - `src/lib/changelog-service.ts`: add label `salesforce_tenant_names: 'Tenant Names'` beside the sibling.
  - `SOWDataLoader.tsx` (pricing calculator): mirror only if it carries the sibling VALUE; skip if it's count-math.

- [ ] **Step 5: Run gates** — `npm test` and `npm run build` → pass.

- [ ] **Step 6: Commit** — `git commit -am "feat(sow): named SFDC tenants field rendered on SOW outputs"`

### Task 4 (verify-only, controller): no dispatch
Confirm on staging after deploy: empty client-role rows render (N/A) on print/PDF; Appendix A present at SOW end. Recorded here so the final review knows they were spec items.
