// import { supabase } from './supabase'; // Not currently used
import { SOWContentTemplate } from '@/types/sow';
import { sanitizeHtml } from './sanitize-html';

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
 *   (ObjectivesTab → tab-column-mapping.ts) writes BOTH
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