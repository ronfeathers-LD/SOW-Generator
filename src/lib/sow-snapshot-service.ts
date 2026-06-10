import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SOW_SECTION_KEYS,
  SOW_SECTION_RENDERED_COLUMNS,
} from './sow-content';

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

  // Fetch exactly the columns we snapshot, plus the version stamp.
  const renderedColumns = Array.from(
    new Set(Object.values(SOW_SECTION_RENDERED_COLUMNS))
  );
  const { data: sow, error } = await supabase
    .from('sows')
    .select(['version', ...renderedColumns].join(', '))
    .eq('id', sowId)
    .single();

  if (error || !sow) {
    throw new Error(
      `Failed to load SOW ${sowId} for content snapshot: ${error?.message ?? 'not found'}`
    );
  }

  const sowRow = sow as unknown as Record<string, unknown>;
  const submissionId = randomUUID();

  const rows = SOW_SECTION_KEYS.map((sectionKey) => {
    const column = SOW_SECTION_RENDERED_COLUMNS[sectionKey];
    const value = sowRow[column];
    return {
      sow_id: sowId,
      sow_version: typeof sowRow.version === 'number' ? sowRow.version : 1,
      submission_id: submissionId,
      section_key: sectionKey,
      // Preserve NULL (section rendered from defaults); store strings as-is —
      // write paths already canonicalize these columns (#346).
      content: typeof value === 'string' ? value : null,
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
