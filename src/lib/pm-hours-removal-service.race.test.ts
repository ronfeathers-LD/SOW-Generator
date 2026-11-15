import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PMHoursRemovalService } from './pm-hours-removal-service';

/**
 * Simulates a concurrent-processing race: the handler reads the request as
 * `readStatus`, but by the time its UPDATE runs the row is already `dbStatus`.
 * An UPDATE only affects the row when every .eq('status', x) condition matches
 * the DB status, as Postgres would.
 */
function makeRaceClient(readStatus: string, dbStatus: string) {
  const captured = { sowUpdates: 0, requestUpdates: 0 };

  const client = {
    from(table: string) {
      if (table === 'pm_hours_removal_requests') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'req-1',
                  sow_id: 'sow-1',
                  status: readStatus,
                  current_pm_hours: 10,
                },
                error: null,
              }),
            }),
          }),
          update: () => {
            captured.requestUpdates++;
            let matches = true;
            const builder = {
              eq(col: string, val: unknown) {
                if (col === 'status' && val !== dbStatus) matches = false;
                return builder;
              },
              select: async () => ({ data: matches ? [{ id: 'req-1' }] : [], error: null }),
              then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
            };
            return builder;
          },
        };
      }
      if (table === 'sows') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { status: 'draft', pricing_roles: null }, error: null }) }),
          }),
          update: () => {
            captured.sowUpdates++;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  } as unknown as SupabaseClient;

  return { client, captured };
}

describe('PM hours removal status-guarded transitions (audit #161)', () => {
  it('approveRequest reports already processed and does not touch the SOW when the request changed under it', async () => {
    const { client, captured } = makeRaceClient('pending', 'approved');
    const result = await PMHoursRemovalService.approveRequest('req-1', 'pmo-1', 0, undefined, client);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already processed/i);
    expect(captured.sowUpdates).toBe(0);
  });

  it('rejectRequest reports already processed when the request changed under it', async () => {
    const { client } = makeRaceClient('pending', 'approved');
    const result = await PMHoursRemovalService.rejectRequest('req-1', 'pmo-1', 'nope', 0, client);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already processed/i);
  });

  it('reverseRequest reports already processed and does not touch the SOW when the request changed under it', async () => {
    const { client, captured } = makeRaceClient('approved', 'pending');
    const result = await PMHoursRemovalService.reverseRequest('req-1', 'admin-1', 'oops', client);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already processed/i);
    expect(captured.sowUpdates).toBe(0);
  });

  it('approveRequest still succeeds when the request is genuinely pending', async () => {
    const { client } = makeRaceClient('pending', 'pending');
    const result = await PMHoursRemovalService.approveRequest('req-1', 'pmo-1', 0, undefined, client);
    expect(result.success).toBe(true);
  });
});
