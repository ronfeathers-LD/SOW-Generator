// import { supabase } from './supabase'; // Not currently used
import { SOWContentTemplate } from '@/types/sow';
import { sanitizeHtml } from './sanitize-html';
import { processContent } from './text-to-html';
import { normalizeSegment } from '@/lib/segment-rules';

/**
 * Canonical registry of SOW content sections → their `sows` table columns.
 *
 * This is the single source of truth for "which DB columns hold rendered SOW
 * section HTML". The anchored-comments pipeline (#346+) keys everything off
 * these section keys: write paths canonicalize exactly these columns, the
 * shared renderer (`SOWSectionContent`) tags rendered sections with
 * `data-section-key`, and future phases (content snapshots, text anchors)
 * reference sections by these keys.
 */
export const SOW_SECTION_CONTENT_COLUMNS = {
  intro: 'custom_intro_content',
  scope: 'custom_scope_content',
  out_of_scope: 'custom_out_of_scope_content',
  objectives_disclosure: 'custom_objectives_disclosure_content',
  assumptions: 'custom_assumptions_content',
  project_phases: 'custom_project_phases_content',
  roles: 'custom_roles_content',
  deliverables: 'custom_deliverables_content',
  objective_overview: 'custom_objective_overview_content',
  key_objectives: 'custom_key_objectives_content',
} as const;

/**
 * Standard payment terms language carried by every mined LeanData-paper SOW.
 * Seeded onto new SOWs at creation (`payment_terms` column); editable per-SOW
 * thereafter via the Billing Information tab.
 */
export const DEFAULT_PAYMENT_TERMS =
  'Billed monthly, as incurred; payment due upon receipt.';

export type SOWSectionKey = keyof typeof SOW_SECTION_CONTENT_COLUMNS;
export type SOWSectionContentColumn =
  (typeof SOW_SECTION_CONTENT_COLUMNS)[SOWSectionKey];

export const SOW_SECTION_KEYS = Object.keys(
  SOW_SECTION_CONTENT_COLUMNS
) as SOWSectionKey[];

export const SOW_SECTION_CONTENT_COLUMN_NAMES = Object.values(
  SOW_SECTION_CONTENT_COLUMNS
) as SOWSectionContentColumn[];

/**
 * Human-readable section names (#351) — shown wherever a section key surfaces
 * in UI (e.g. the section chip on anchored comments in the Comments tab).
 * Completeness against SOWSectionKey is enforced by the type AND a test.
 */
export const SOW_SECTION_LABELS: Record<SOWSectionKey, string> = {
  intro: 'Introduction',
  scope: 'Scope',
  out_of_scope: 'Out of Scope',
  objectives_disclosure: 'Objectives Disclosure',
  assumptions: 'Assumptions',
  project_phases: 'Project Phases',
  roles: 'Roles & Responsibilities',
  deliverables: 'Deliverables',
  objective_overview: 'Objective Overview',
  key_objectives: 'Key Objectives',
};

/** Label for a section key coming from untrusted/legacy data. */
export function sectionLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return (SOW_SECTION_LABELS as Record<string, string>)[key] ?? key;
}

/**
 * Section key → the `sows` column whose content is actually RENDERED for that
 * section (what a reviewer sees on the page / in the PDF). Content snapshots
 * (#347) and anchor resolution must read these columns, not blindly the
 * `custom_*` columns above.
 *
 * For every key except `objective_overview` this is identical to
 * SOW_SECTION_CONTENT_COLUMNS. The exception, established by tracing the
 * render path (decision for #347):
 *
 *   SOWObjectivesPage renders the "Objective:" block from its
 *   `projectDescription` prop ← `sow.projectDescription` ←
 *   `objectives.description` (map-api-response-to-display.ts) ←
 *   `objectives_description` (map-sow-response.ts). The edit UI
 *   (ObjectivesEditor → tab-column-mapping.ts) writes BOTH
 *   `objectives_description` and `custom_objective_overview_content`, but the
 *   renderer only ever reads `objectives_description` — so that is the column
 *   a reviewer's comment is anchored against, and the one we snapshot.
 *
 * Note: when a `custom_*` column is NULL the page may fall back to a default
 * template (intro, scope, …) or structured data (key_objectives array). A
 * NULL snapshot therefore means "rendered from defaults at submit time",
 * which is stable/recoverable and intentionally not inlined here.
 */
export const SOW_SECTION_RENDERED_COLUMNS: Record<SOWSectionKey, string> = {
  ...SOW_SECTION_CONTENT_COLUMNS,
  objective_overview: 'objectives_description',
};

/**
 * Strip inline styles/classes from table elements only (preserve image
 * styles). The SOW view applies this to project_phases content before
 * rendering (SOWProjectPhasesPage); it is textContent-preserving (attributes
 * only), but it IS part of the rendered transform chain, so the server-side
 * renderer reproduces it. Single definition shared by the component and
 * SOW_SECTION_RENDER_TRANSFORMS — do not fork.
 */
export function stripTableInlineStyles(html: string): string {
  if (!html) return '';

  // Remove style and class attributes from ONLY table-related elements
  const cleaned = html
    // Remove style attributes from table elements only
    .replace(/<table[^>]*style="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<thead[^>]*style="[^"]*"[^>]*>/gi, '<thead>')
    .replace(/<tbody[^>]*style="[^"]*"[^>]*>/gi, '<tbody>')
    .replace(/<tr[^>]*style="[^"]*"[^>]*>/gi, '<tr>')
    .replace(/<th[^>]*style="[^"]*"[^>]*>/gi, '<th>')
    .replace(/<td[^>]*style="[^"]*"[^>]*>/gi, '<td>')
    .replace(/<colgroup[^>]*style="[^"]*"[^>]*>/gi, '<colgroup>')
    .replace(/<col[^>]*style="[^"]*"[^>]*>/gi, '<col>')
    // Remove class attributes from table elements only
    .replace(/<table[^>]*class="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<thead[^>]*class="[^"]*"[^>]*>/gi, '<thead>')
    .replace(/<tbody[^>]*class="[^"]*"[^>]*>/gi, '<tbody>')
    .replace(/<tr[^>]*class="[^"]*"[^>]*>/gi, '<tr>')
    .replace(/<th[^>]*class="[^"]*"[^>]*>/gi, '<th>')
    .replace(/<td[^>]*class="[^"]*"[^>]*>/gi, '<td>')
    .replace(/<colgroup[^>]*class="[^"]*"[^>]*>/gi, '<colgroup>')
    .replace(/<col[^>]*class="[^"]*"[^>]*>/gi, '<col>')
    // Remove other table-specific attributes that might interfere
    .replace(/<table[^>]*min-width="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<col[^>]*min-width="[^"]*"[^>]*>/gi, '<col>');

  return cleaned;
}

/**
 * Replicate SOWIntroPage's `{clientName}` substitution byte-for-byte: a
 * truthy client name becomes a bold span; a falsy one becomes the literal
 * `[Client Name]` placeholder (also in a bold span). Exported so tests can
 * assert parity with the component.
 */
export function substituteClientName(
  html: string,
  clientName: string | null | undefined
): string {
  if (clientName) {
    return html.replace(/{clientName}/g, `<span class="font-bold">${clientName}</span>`);
  }
  return html.replace(/{clientName}/g, '<span class="font-bold">[Client Name]</span>');
}

/** Context the render transforms need beyond the stored HTML itself. */
export interface SectionRenderContext {
  /**
   * The client name the SOW view substitutes into the intro. SOWFullView
   * passes `salesforceData?.account_data?.name || sow.clientName` to
   * SOWIntroPage — i.e. the linked Salesforce account's name when present,
   * else `sows.client_name`. Falsy → the `[Client Name]` placeholder.
   */
  clientName?: string | null;
}

/**
 * Section key → the exact transform the UI applies to the STORED column value
 * before it reaches SOWSectionContent (#351). This is the load-bearing map for
 * anchored comments: client-side anchors are captured against the RENDERED
 * DOM, so server-side anchor validation and content snapshots must run the
 * same transforms or the two coordinate spaces diverge (selecting the client
 * name in the intro would 422, since the stored column says `{clientName}`).
 *
 * Traced render paths (keep in sync with the components):
 * - intro                  SOWIntroPage:        processContent + {clientName} substitution
 * - scope                  SOWScopePage:        useSOWContent → processContent
 * - out_of_scope           SOWOutOfScopePage:   useSOWContent → processContent
 * - objectives_disclosure  SOWObjectivesPage:   processContent (SOWObjectivesDisclosurePage matches)
 * - assumptions            SOWAssumptionsPage:  useSOWContent → processContent
 * - key_objectives         SOWObjectivesPage:   processContent
 * - project_phases         SOWProjectPhasesPage: stripTableInlineStyles (textContent-preserving)
 * - objective_overview     SOWObjectivesPage:   rendered RAW (html={projectDescription})
 * - deliverables           SOWScopePage:        rendered RAW
 * - roles                  no SOWSectionContent renderer (tables built from structured data) → RAW
 */
export const SOW_SECTION_RENDER_TRANSFORMS: Record<
  SOWSectionKey,
  (storedHtml: string, context: SectionRenderContext) => string
> = {
  intro: (html, context) => substituteClientName(processContent(html), context.clientName),
  scope: (html) => processContent(html),
  out_of_scope: (html) => processContent(html),
  objectives_disclosure: (html) => processContent(html),
  assumptions: (html) => processContent(html),
  project_phases: (html) => stripTableInlineStyles(html),
  roles: (html) => html,
  deliverables: (html) => html,
  objective_overview: (html) => html,
  key_objectives: (html) => processContent(html),
};

/**
 * Render a section's stored column value the way the SOW view renders it —
 * the single server-usable reproduction of the per-component transform chains
 * (see SOW_SECTION_RENDER_TRANSFORMS). Pure string-in/string-out: no React,
 * no DOM. The final render-time sanitization (SOWSectionContent) is NOT
 * applied here; htmlToAnchorText sanitizes with the same shared config when
 * computing anchor text, so textContent parity holds.
 *
 * null/undefined stored content stays null ("rendered from defaults" — the
 * UI falls back to templates/structured data, which are not anchorable).
 */
export function renderSectionHtml(
  sectionKey: SOWSectionKey,
  storedHtml: string | null | undefined,
  context: SectionRenderContext = {}
): string | null {
  if (typeof storedHtml !== 'string') return null;
  return SOW_SECTION_RENDER_TRANSFORMS[sectionKey](storedHtml, context);
}

/**
 * Canonicalize SOW section HTML for storage.
 *
 * Stored section HTML must be byte-stable across edit→save→render cycles so
 * that text anchors (quote + context against a section's rendered textContent)
 * survive round-trips. The canonical form is: sanitize through DOMPurify
 * (whose parse→serialize is deterministic), with line endings normalized to
 * `\n` and outer whitespace trimmed. Deliberately conservative — no whitespace
 * collapsing inside the markup (would corrupt <pre>/<code>), no manual
 * attribute juggling.
 *
 * HARD REQUIREMENT (tested): idempotent —
 * `canonicalizeContent(canonicalizeContent(x)) === canonicalizeContent(x)`.
 *
 * null/undefined pass through unchanged so callers' null semantics are
 * preserved (a missing section must stay missing, not become '').
 */
export function canonicalizeContent(html: string): string;
export function canonicalizeContent(html: null): null;
export function canonicalizeContent(html: undefined): undefined;
export function canonicalizeContent(
  html: string | null | undefined
): string | null | undefined;
export function canonicalizeContent(
  html: string | null | undefined
): string | null | undefined {
  if (html === null || html === undefined) return html;
  // Normalize line endings before parsing so CRLF vs LF input can't produce
  // two different canonical byte sequences.
  const normalized = String(html).replace(/\r\n?/g, '\n');
  return sanitizeHtml(normalized).trim();
}

/**
 * Canonicalize every registered section-content column present on a pending
 * `sows` update/insert payload, in place. Only string values are touched —
 * null/undefined (and absent keys) pass through untouched. All other columns
 * are left exactly as provided.
 */
export function canonicalizeContentColumns<T extends Record<string, unknown>>(
  update: T
): T {
  for (const column of SOW_SECTION_CONTENT_COLUMN_NAMES) {
    const value = update[column];
    if (typeof value === 'string') {
      (update as Record<string, unknown>)[column] = canonicalizeContent(value);
    }
  }
  return update;
}

/**
 * Resolve one default-content value per `section_name` for a given SOW
 * segment (ENT roadmap Phase 3 §3). Pure: no fetch, no DB.
 *
 * Per section, prefers the row whose `segment` matches the normalized
 * segment code (`normalizeSegment`); falls back to the row with a null/
 * undefined `segment` (the global/default row). Rows whose `segment` is set
 * but does NOT match are ignored entirely (never used as a fallback for a
 * different segment, and never override the exact match).
 *
 * Row order doesn't matter — every row is inspected once; the first
 * candidate found for each of "exact match" / "global" wins, but since only
 * one row per (section_name, segment) is expected, this is effectively
 * deterministic regardless of duplicates.
 */
export function resolveTemplatesForSegment(
  rows: Array<{
    section_name: string;
    default_content: string;
    segment?: string | null;
  }>,
  segment: string | null | undefined
): Map<string, string> {
  const code = normalizeSegment(segment);

  const exactBySection = new Map<string, string>();
  const globalBySection = new Map<string, string>();

  rows.forEach((row) => {
    const rowSegment = row.segment ?? null;
    if (rowSegment === null || rowSegment === undefined) {
      globalBySection.set(row.section_name, row.default_content);
    } else if (code && rowSegment === code) {
      exactBySection.set(row.section_name, row.default_content);
    }
    // else: row is scoped to a different, non-matching segment — ignored.
  });

  const resolved = new Map<string, string>(globalBySection);
  exactBySection.forEach((content, section) => {
    resolved.set(section, content);
  });
  return resolved;
}

export async function getContentTemplate(sectionName: string): Promise<SOWContentTemplate | null> {
  try {
    const response = await fetch('/api/sow-content-templates');
    if (!response.ok) {
      console.error('Error fetching content templates:', response.statusText);
      return null;
    }
    
    const templates = await response.json();
    const template = templates.find((t: SOWContentTemplate) => t.section_name === sectionName);
    
    return template || null;
  } catch (error) {
    console.error('Error in getContentTemplate:', error);
    return null;
  }
}

export async function getAllContentTemplates(): Promise<SOWContentTemplate[]> {
  try {
    const response = await fetch('/api/sow-content-templates');
    if (!response.ok) {
      console.error('Error fetching content templates:', response.statusText);
      return [];
    }
    
    const templates = await response.json();
    return templates || [];
  } catch (error) {
    console.error('Error in getAllContentTemplates:', error);
    return [];
  }
}



export function processContentTemplate(
  template: SOWContentTemplate,
  replacements: Record<string, string>
): string {
  let content = template.default_content;

  // Replace placeholders with actual values
  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  });

  return content;
}

export function processIntroContent(
  content: string,
  clientName: string
): string {
  // Replace the placeholder with a bold span for the client name
  return content.replace(/{clientName}/g, `<span class="font-bold">${clientName}</span>`);
}

export function processScopeContent(
  content: string,
  deliverables: string[]
): string {
  // Process deliverables - they should come as strings that can be formatted
  // Each deliverable might be a category with items, or individual items
  const deliverablesHtml = deliverables
    .map((deliverable) => {
      // Check if this is a category with items (contains newlines)
      if (deliverable.includes('\n')) {
        const lines = deliverable.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const category = lines[0]; // First line is the category
        const items = lines.slice(1); // Rest are items
        
        const itemsHtml = items
          .map(item => `<div class="ml-4 mb-2">${item}</div>`)
          .join('\n');
        
        return `<div class="mb-4">
          <div class="font-bold text-lg mb-2">${category}</div>
          ${itemsHtml}
        </div>`;
      } else {
        // Single item
        return `<div class="mb-4"><div>${deliverable}</div></div>`;
      }
    })
    .join('\n');

  return content.replace(/{deliverables}/g, deliverablesHtml);
} 