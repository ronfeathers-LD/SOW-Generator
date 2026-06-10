import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { captureContentSnapshots } from './sow-snapshot-service';
import {
  SOW_SECTION_KEYS,
  SOW_SECTION_RENDERED_COLUMNS,
} from './sow-content';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SnapshotRow {
  sow_id: string;
  sow_version: number;
  submission_id: string;
  section_key: string;
  content: string | null;
}

/**
 * Minimal mock of the query chains the service uses:
 *   from('sows').select(...).eq(...).single()
 *   from('sow_salesforce_data').select(...).eq(...).maybeSingle()  (only when
 *     the sows row has a salesforce_account_id)
 *   from('sow_content_snapshots').insert(rows)
 */
function makeMockClient(options: {
  sowRow?: Record<string, unknown> | null;
  /** sow_salesforce_data row (e.g. { account_data: { name: 'X' } }). */
  salesforceRow?: Record<string, unknown> | null;
  selectError?: { message: string } | null;
  insertError?: { message: string } | null;
}) {
  const inserted: SnapshotRow[] = [];
  let selectedColumns = '';

  const client = {
    from(table: string) {
      if (table === 'sows') {
        return {
          select(columns: string) {
            selectedColumns = columns;
            return {
              eq() {
                return {
                  async single() {
                    return {
                      data: options.sowRow ?? null,
                      error: options.selectError ?? null,
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'sow_salesforce_data') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: options.salesforceRow ?? null, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'sow_content_snapshots') {
        return {
          async insert(rows: SnapshotRow[]) {
            inserted.push(...rows);
            return { error: options.insertError ?? null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return {
    client,
    inserted,
    getSelectedColumns: () => selectedColumns,
  };
}

/** A fully-populated sows row covering every rendered column. */
function fullSowRow(): Record<string, unknown> {
  const row: Record<string, unknown> = { version: 3 };
  for (const key of SOW_SECTION_KEYS) {
    row[SOW_SECTION_RENDERED_COLUMNS[key]] = `<p>${key} content</p>`;
  }
  return row;
}

describe('captureContentSnapshots', () => {
  it('inserts exactly one row per section key', async () => {
    const { client, inserted } = makeMockClient({ sowRow: fullSowRow() });

    await captureContentSnapshots('sow-1', client);

    expect(inserted).toHaveLength(SOW_SECTION_KEYS.length);
    expect(inserted.map((r) => r.section_key).sort()).toEqual(
      [...SOW_SECTION_KEYS].sort()
    );
    for (const row of inserted) {
      expect(row.sow_id).toBe('sow-1');
      expect(row.sow_version).toBe(3);
    }
  });

  it('returns a uuid submission_id shared by every inserted row', async () => {
    const { client, inserted } = makeMockClient({ sowRow: fullSowRow() });

    const submissionId = await captureContentSnapshots('sow-1', client);

    expect(submissionId).toMatch(UUID_RE);
    for (const row of inserted) {
      expect(row.submission_id).toBe(submissionId);
    }
  });

  it('generates a fresh submission_id per capture', async () => {
    const first = makeMockClient({ sowRow: fullSowRow() });
    const second = makeMockClient({ sowRow: fullSowRow() });

    const id1 = await captureContentSnapshots('sow-1', first.client);
    const id2 = await captureContentSnapshots('sow-1', second.client);

    expect(id1).not.toBe(id2);
  });

  it('snapshots the RENDERED column for objective_overview (objectives_description, not the custom column)', async () => {
    const row = fullSowRow();
    row.objectives_description = '<p>rendered objective text</p>';
    // The custom column exists and differs — it must NOT be what we snapshot.
    row.custom_objective_overview_content = '<p>stale custom copy</p>';
    const { client, inserted, getSelectedColumns } = makeMockClient({
      sowRow: row,
    });

    await captureContentSnapshots('sow-1', client);

    const objectiveRow = inserted.find(
      (r) => r.section_key === 'objective_overview'
    );
    expect(objectiveRow?.content).toBe('<p>rendered objective text</p>');
    expect(getSelectedColumns()).toContain('objectives_description');
  });

  it('snapshots each remaining section from its registered content column', async () => {
    const { client, inserted } = makeMockClient({ sowRow: fullSowRow() });

    await captureContentSnapshots('sow-1', client);

    for (const key of SOW_SECTION_KEYS) {
      const row = inserted.find((r) => r.section_key === key);
      expect(row?.content).toBe(`<p>${key} content</p>`);
    }
  });

  it('preserves NULL content (section rendered from defaults) instead of coercing to empty string', async () => {
    const row = fullSowRow();
    row.custom_intro_content = null; // explicit NULL in the DB
    delete row.custom_scope_content; // column absent from the row entirely
    const { client, inserted } = makeMockClient({ sowRow: row });

    await captureContentSnapshots('sow-1', client);

    expect(inserted.find((r) => r.section_key === 'intro')?.content).toBeNull();
    expect(inserted.find((r) => r.section_key === 'scope')?.content).toBeNull();
    // Sanity check: a populated section is unaffected.
    expect(
      inserted.find((r) => r.section_key === 'assumptions')?.content
    ).toBe('<p>assumptions content</p>');
  });

  it('defaults sow_version to 1 when the row has no numeric version', async () => {
    const row = fullSowRow();
    delete row.version;
    const { client, inserted } = makeMockClient({ sowRow: row });

    await captureContentSnapshots('sow-1', client);

    for (const snapshot of inserted) {
      expect(snapshot.sow_version).toBe(1);
    }
  });

  it('throws when the SOW cannot be loaded', async () => {
    const { client, inserted } = makeMockClient({
      sowRow: null,
      selectError: { message: 'boom' },
    });

    await expect(captureContentSnapshots('sow-x', client)).rejects.toThrow(
      /Failed to load SOW sow-x/
    );
    expect(inserted).toHaveLength(0);
  });

  it('throws when the insert fails', async () => {
    const { client } = makeMockClient({
      sowRow: fullSowRow(),
      insertError: { message: 'insert exploded' },
    });

    await expect(captureContentSnapshots('sow-1', client)).rejects.toThrow(
      /Failed to insert content snapshots for SOW sow-1/
    );
  });

  // ── #351: snapshot content stores the column AS RENDERED ──────────────────

  it('stores the intro with {clientName} substituted (sows.client_name fallback)', async () => {
    const row = fullSowRow();
    row.client_name = 'Fallback Inc';
    row.custom_intro_content = '<p>Between LeanData and {clientName}.</p>';
    const { client, inserted, getSelectedColumns } = makeMockClient({ sowRow: row });

    await captureContentSnapshots('sow-1', client);

    expect(inserted.find((r) => r.section_key === 'intro')?.content).toBe(
      '<p>Between LeanData and <span class="font-bold">Fallback Inc</span>.</p>'
    );
    expect(getSelectedColumns()).toContain('client_name');
    expect(getSelectedColumns()).toContain('salesforce_account_id');
  });

  it('prefers the Salesforce account name over sows.client_name (UI precedence)', async () => {
    const row = fullSowRow();
    row.client_name = 'Stale Name';
    row.salesforce_account_id = 'sf-acct-1';
    row.custom_intro_content = '<p>Client: {clientName}</p>';
    const { client, inserted } = makeMockClient({
      sowRow: row,
      salesforceRow: { account_data: { name: 'Acme Corp' } },
    });

    await captureContentSnapshots('sow-1', client);

    expect(inserted.find((r) => r.section_key === 'intro')?.content).toBe(
      '<p>Client: <span class="font-bold">Acme Corp</span></p>'
    );
  });

  it('substitutes the [Client Name] placeholder when no client name resolves', async () => {
    const row = fullSowRow();
    row.custom_intro_content = '<p>Client: {clientName}</p>';
    const { client, inserted } = makeMockClient({ sowRow: row });

    await captureContentSnapshots('sow-1', client);

    expect(inserted.find((r) => r.section_key === 'intro')?.content).toBe(
      '<p>Client: <span class="font-bold">[Client Name]</span></p>'
    );
  });

  it('stores plain-text content as the UI renders it (processContent/textToHtml)', async () => {
    const row = fullSowRow();
    row.custom_scope_content = 'Scope line one\n- bullet a';
    const { client, inserted } = makeMockClient({ sowRow: row });

    await captureContentSnapshots('sow-1', client);

    const content = inserted.find((r) => r.section_key === 'scope')?.content;
    expect(content).toContain('<p class="mb-4">Scope line one</p>');
    expect(content).toContain('<li class="mb-1">bullet a</li>');
  });

  it('leaves canonical HTML content byte-identical (transforms are a no-op)', async () => {
    const { client, inserted } = makeMockClient({ sowRow: fullSowRow() });

    await captureContentSnapshots('sow-1', client);

    for (const key of SOW_SECTION_KEYS) {
      expect(inserted.find((r) => r.section_key === key)?.content).toBe(
        `<p>${key} content</p>`
      );
    }
  });
});
