/**
 * Save-all for the SOW form (fixes #109).
 *
 * Persists every visible tab in one user action instead of only the active tab.
 * All tabs are sent to the `PUT /api/sow/[id]/bulk-update` endpoint, which
 * applies the same field→column mapping as the per-tab `tab-update` route but
 * authorizes, reads, updates, and logs the changelog ONCE for the whole save
 * (previously this was one round-trip per tab). The server applies the tabs in
 * the order sent and merges shared columns last-write-wins, matching the old
 * sequential semantics; the billing_info JSONB merge reads the row once.
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
  // Build each tab's payload; skip tabs that produce nothing to save.
  const tabs = tabKeys
    .map((tab) => ({ tab, data: buildTabPayload(tab, formData, ctx) }))
    .filter((t): t is { tab: SowTabKey; data: Record<string, unknown> } => t.data != null);

  if (tabs.length === 0) {
    return { ok: true, failed: [] };
  }

  // A bulk save is atomic (one update), so a failure fails the whole set; report
  // every attempted tab so the form's "couldn't save: …" message stays useful.
  const allFailed = (message: string): SaveAllResult => ({
    ok: false,
    failed: tabs.map((t) => ({ tab: t.tab, error: message })),
  });

  try {
    const response = await fetch(`/api/sow/${sowId}/bulk-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs }),
    });

    if (response.ok) {
      return { ok: true, failed: [] };
    }

    let message = 'Failed to save changes';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body; keep the default message
    }
    return allFailed(message);
  } catch (error) {
    return allFailed(error instanceof Error ? error.message : 'Failed to save changes');
  }
}
