# Segment Rules Substrate (ENT Roadmap Phase 1) — Design

**Date:** 2026-07-05
**Status:** Approved design, pre-implementation
**Parent:** `2026-07-04-ent-readiness-and-simplification-assessment.md` §6 Phase 1

## Goal

Move the app's two hardcoded segment behaviors into a DB-driven `segment_rules` config with an admin page, so future segment-driven features (Phases 3/4) extend config instead of scattering literals. **Zero behavior change at seeded values.**

The two behaviors today:
1. **ENT self-serve PM-hours removal** — `PricingRolesAndDiscount.tsx:145`: `accountSegmentValue === 'EE' || accountSegmentValue === 'LE'` gates the self-serve vs PMO-approval flow.
2. **MM hours bump** — `hours-calculation-utils.ts:129`: `accountSegment === 'MM' || accountSegment === 'MidMarket'` → +5 hours.

Decisions made in design review:
- **Scope:** table + helper + **editable admin page** (not read-only, not deferred).
- **Rules:** only today's two (`pm_removal_self_serve`, `extra_hours`). No future stubs, no JSONB.
- **Approach:** rules-as-data threaded from one fetch (client fetches once, calculations stay pure/synchronous).

## 1. Schema

Migration `NNN_create_segment_rules.sql` (next sequential number at implementation time):

```sql
CREATE TABLE segment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment TEXT UNIQUE NOT NULL,             -- 'LE' | 'EE' | 'MM' | 'EC'
  display_name TEXT NOT NULL,
  pm_removal_self_serve BOOLEAN NOT NULL DEFAULT false,
  extra_hours INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()      -- + updated_at trigger, same as pricing_roles_config
);
```

Seed rows: `LE ('Large Enterprise', true, 0)`, `EE ('Emerging Enterprise', true, 0)`, `MM ('Mid-Market', false, 5)`, `EC ('Commercial', false, 0)`.

RLS: same admin-access policy shape as the sibling config tables (`pricing_roles_config`, `approval_stages`).

Legacy `'MidMarket'` segment values are normalized to `'MM'` in the lookup layer — the table stores canonical codes only.

## 2. Rules library — `src/lib/segment-rules.ts`

- `type SegmentRules = { segment: string; displayName: string; pmRemovalSelfServe: boolean; extraHours: number }`
- `type SegmentRulesMap = Record<string, SegmentRules>`
- `DEFAULT_SEGMENT_RULES: SegmentRulesMap` — constants mirroring the seed exactly. This is where today's literals move to, and the fallback when the DB is unreachable/empty.
- `getSegmentRules(): Promise<SegmentRulesMap>` — server-side fetch via service-role client, active rows only; falls back to `DEFAULT_SEGMENT_RULES` on error or empty result. Mirrors `pricing-roles-config.ts`.
- Pure lookups (take rules as data — usable client- and server-side, trivially testable):
  - `normalizeSegment(segment: string | null | undefined): string` — trims, maps `'MidMarket'` → `'MM'`; unknown/empty stays as-is.
  - `isSelfServePmRemoval(rules: SegmentRulesMap, segment: string | null | undefined): boolean` — unknown/null segment → `false` (today's safe default: requires approval).
  - `getExtraHours(rules: SegmentRulesMap, segment: string | null | undefined): number` — unknown/null → `0`.

## 3. API

- `GET /api/segment-rules` — authenticated (any signed-in user); returns the effective `SegmentRulesMap`. No caching in v1.
- `GET /api/admin/segment-rules` + `PUT /api/admin/segment-rules/[id]` — admin-role gated, standard admin-config route shape. PUT accepts `{ pm_removal_self_serve, extra_hours, display_name }`; validates `extra_hours` is an integer ≥ 0 and ≤ 100.

## 4. Consumer migration (behavior-identical)

### hours-calculation-utils.ts
- `calculateAccountSegmentHours(accountSegment)` → reimplemented as `getExtraHours(rules, accountSegment)`; the function gains a `rules` parameter (or is absorbed into callers).
- `calculateAllHours(template, accountSegment)` → `calculateAllHours(template, accountSegment, rules)`. All callers thread rules through.
- Existing unit tests updated to pass rules; new test proves a changed `extra_hours` value changes the bump (i.e., the value is genuinely config-driven).

### PricingRolesAndDiscount.tsx / SOWForm
- The SOW form fetches `/api/segment-rules` once on load (alongside its existing config fetches) and passes the map down as a prop.
- `isEnterpriseSegment` (line 145) → `isSelfServePmRemoval(rules, accountSegmentValue)`.
- Fetch failure → `DEFAULT_SEGMENT_RULES`; the form must never block on this fetch.

### Server-side enforcement (new, small security win)
The enterprise-disable API route (`app/api/pm-hours-removal/enterprise-disable/`) currently trusts the client's gating. It will re-validate: load the SOW's `account_segment`, check `isSelfServePmRemoval(await getSegmentRules(), segment)`, and 403 with a clear message if not eligible. The client-side gate remains for UX; the server becomes the enforcer.

## 5. Admin page — `/admin/segment-rules`

Standard admin-config template (like `/admin/pricing-roles`): a table of the four segments with display name, self-serve toggle, extra-hours number input; per-row save via the PUT route; admin-role gated by the existing admin layout. No add/delete — segment codes are fixed by the Salesforce `Employee_Band__c` mapping. A short explainer at the top states what each rule drives and that changes take effect on next form load (no deploy).

## 6. Testing & verification

- Unit: lookups (all four segments, `'MidMarket'` normalization, unknown/null/empty segment), fallback path (DB error → defaults), PUT validation bounds.
- Migrated: existing hours-calculation tests, passing explicit rules.
- Manual (staging): MM SOW shows +5h; LE/EE SOW offers self-serve PM removal; EC SOW routes to PMO; flip MM `extra_hours` to 10 in admin → new SOW pricing shows +10 without deploy; direct POST to enterprise-disable for an EC SOW → 403.

## Non-goals

No new rule columns; no tab/section gating; no template variants; no approval-chain changes; no behavior change at seeded values. Those are Phases 3/4 of the roadmap.
