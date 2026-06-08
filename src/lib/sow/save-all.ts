/**
 * Save-all for the SOW form (fixes #109).
 *
 * Persists every visible tab in one user action instead of only the active tab.
 * Each tab is sent through the existing `PUT /api/sow/[id]/tab-update` endpoint
 * so all server-side validation and special-casing (pricing recompute, billing
 * merge, in-review restrictions, per-tab changelog) is reused untouched.
 *
 * Tabs are saved sequentially to avoid interleaved read-modify-write races on
 * the same SOW row (e.g. the billing_info JSONB merge reads the current row).
 */
import { SOWData } from '@/types/sow';
import {
  buildTabPayload,
  SowTabKey,
  TabPayloadContext,
} from './tab-payloads';

export interface SaveAllResult {
  ok: boolean;
  /** Tabs that failed to save, with the server-reported reason. */
  failed: Array<{ tab: SowTabKey; error: string }>;
}

export async function saveAllTabs(
  sowId: string,
  tabKeys: readonly SowTabKey[],
  formData: Partial<SOWData>,
  ctx: TabPayloadContext,
): Promise<SaveAllResult> {
  const failed: SaveAllResult['failed'] = [];

  for (const tab of tabKeys) {
    const data = buildTabPayload(tab, formData, ctx);
    if (!data) continue;

    try {
      const response = await fetch(`/api/sow/${sowId}/tab-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, data }),
      });

      if (!response.ok) {
        let message = `Failed to save ${tab}`;
        try {
          const body = await response.json();
          if (body?.error) message = body.error;
        } catch {
          // non-JSON error body; keep the default message
        }
        failed.push({ tab, error: message });
      }
    } catch (error) {
      failed.push({
        tab,
        error: error instanceof Error ? error.message : `Failed to save ${tab}`,
      });
    }
  }

  return { ok: failed.length === 0, failed };
}
