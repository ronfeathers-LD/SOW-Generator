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
