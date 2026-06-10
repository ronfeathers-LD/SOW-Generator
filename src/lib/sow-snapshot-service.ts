import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  renderSectionHtml,
  SOW_SECTION_KEYS,
  SOW_SECTION_RENDERED_COLUMNS,
} from './sow-content';
import { resolveRenderedClientName } from './sow-client-name';

/**
 * Content snapshots at submit-for-review (#347).
 *
 * When a SOW transitions to 'in_review' we capture one row per section key in
 * `sow_content_snapshots`, recording the content of the column that is
 * actually RENDERED for that section (see SOW_SECTION_RENDERED_COLUMNS — for
 * `objective_overview` that is `objectives_description`, not the custom
 * column). All rows from one capture share a generated `submission_id` so the
 * snapshot set is addressable as a unit by later anchored-comments phases.
 *
 * Snapshot `content` stores the column AS RENDERED (#351): the stored value
 * run through the section's render transform chain (renderSectionHtml — e.g.
 * the intro's {clientName} substitution, processContent for sections that get
 * it). Anchors are captured client-side against the rendered DOM, so the
 * snapshot must share that coordinate space for orphan-context anchor_text
 * and future re-anchoring to line up.
 *
 * NULL content is preserved as NULL: it means the section had no stored
 * content at submit time (rendered from a default template / structured
 * data), which is itself useful signal — do not coerce to ''.
 */

/**
 * Capture a snapshot set for a SOW. Returns the submission_id shared by all
 * inserted rows. Throws on failure — the caller (the submit-for-review
 * transition) decides the failure policy (log loudly, don't fail the submit).
 *
 * @param sowId  the SOW being submitted for review
 * @param client optional Supabase client (the route passes its own
 *               service-role-backed client; tests pass a mock). When omitted,
 *               a service-role client is created lazily — lazy so importing
 *               this module in unit tests doesn't require Supabase env vars.
 */
export async function captureContentSnapshots(
  sowId: string,
  client?: SupabaseClient
): Promise<string> {
  const supabase =
    client ??
    (await import('./supabase-server')).createServiceRoleClient();

  // Fetch exactly the columns we snapshot, plus the version stamp and the
  // fields the render transforms need (client name resolution for the intro).
  const renderedColumns = Array.from(
    new Set(Object.values(SOW_SECTION_RENDERED_COLUMNS))
  );
  const { data: sow, error } = await supabase
    .from('sows')
    .select(
      ['version', 'client_name', 'salesforce_account_id', ...renderedColumns].join(', ')
    )
    .eq('id', sowId)
    .single();

  if (error || !sow) {
    throw new Error(
      `Failed to load SOW ${sowId} for content snapshot: ${error?.message ?? 'not found'}`
    );
  }

  const sowRow = sow as unknown as Record<string, unknown>;
  const submissionId = randomUUID();

  // The client name the UI renders into the intro (Salesforce account name,
  // falling back to sows.client_name) — needed so the snapshot stores what was
  // actually on screen, not the {clientName} placeholder.
  const clientName = await resolveRenderedClientName(supabase, sowId, sowRow);

  const rows = SOW_SECTION_KEYS.map((sectionKey) => {
    const column = SOW_SECTION_RENDERED_COLUMNS[sectionKey];
    const value = sowRow[column];
    return {
      sow_id: sowId,
      sow_version: typeof sowRow.version === 'number' ? sowRow.version : 1,
      submission_id: submissionId,
      section_key: sectionKey,
      // Preserve NULL (section rendered from defaults); store strings AS
      // RENDERED (#351): the section's render transform chain applied to the
      // already-canonicalized (#346) stored value.
      content: renderSectionHtml(
        sectionKey,
        typeof value === 'string' ? value : null,
        { clientName }
      ),
    };
  });

  const { error: insertError } = await supabase
    .from('sow_content_snapshots')
    .insert(rows);

  if (insertError) {
    throw new Error(
      `Failed to insert content snapshots for SOW ${sowId}: ${insertError.message}`
    );
  }

  return submissionId;
}
