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
