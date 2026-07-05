// src/lib/segment-rules.ts
// Segment-driven business rules (ENT roadmap Phase 1).
// Storage: segment_rules table (migration 033). Rules are passed to consumers
// as data so calculation functions stay pure and synchronous.

export interface SegmentRule {
  segment: string;
  displayName: string;
  pmRemovalSelfServe: boolean;
  extraHours: number;
}

export type SegmentRulesMap = Record<string, SegmentRule>;

export interface SegmentRuleRow {
  id: string;
  segment: string;
  display_name: string;
  pm_removal_self_serve: boolean;
  extra_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mirrors the migration seed exactly. Fallback when the DB is unreachable —
// and the single place the previously hardcoded literals now live.
export const DEFAULT_SEGMENT_RULES: SegmentRulesMap = {
  LE: { segment: 'LE', displayName: 'Large Enterprise', pmRemovalSelfServe: true, extraHours: 0 },
  EE: { segment: 'EE', displayName: 'Emerging Enterprise', pmRemovalSelfServe: true, extraHours: 0 },
  MM: { segment: 'MM', displayName: 'Mid-Market', pmRemovalSelfServe: false, extraHours: 5 },
  EC: { segment: 'EC', displayName: 'Commercial', pmRemovalSelfServe: false, extraHours: 0 },
};

/** Trim and map legacy spellings ('MidMarket' → 'MM'). Unknown values pass through. */
export function normalizeSegment(segment: string | null | undefined): string {
  const s = (segment ?? '').trim();
  if (s === 'MidMarket') return 'MM';
  return s;
}

/** Unknown/null segments default to false: PM removal requires approval. */
export function isSelfServePmRemoval(
  rules: SegmentRulesMap,
  segment: string | null | undefined
): boolean {
  return rules[normalizeSegment(segment)]?.pmRemovalSelfServe ?? false;
}

/** Unknown/null segments get no bonus hours. */
export function getExtraHours(rules: SegmentRulesMap, segment: string | null | undefined): number {
  return rules[normalizeSegment(segment)]?.extraHours ?? 0;
}

export function rowsToRulesMap(
  rows: Pick<SegmentRuleRow, 'segment' | 'display_name' | 'pm_removal_self_serve' | 'extra_hours'>[]
): SegmentRulesMap {
  const map: SegmentRulesMap = {};
  for (const row of rows) {
    map[row.segment] = {
      segment: row.segment,
      displayName: row.display_name,
      pmRemovalSelfServe: row.pm_removal_self_serve,
      extraHours: row.extra_hours,
    };
  }
  return map;
}

/** Client-side fetch with fallback, mirroring getPricingRolesConfig(). */
export async function fetchSegmentRules(): Promise<SegmentRulesMap> {
  try {
    const response = await fetch('/api/segment-rules');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.rules && Object.keys(data.rules).length > 0 ? data.rules : DEFAULT_SEGMENT_RULES;
  } catch (error) {
    console.error('Failed to fetch segment rules, using defaults:', error);
    return DEFAULT_SEGMENT_RULES;
  }
}
