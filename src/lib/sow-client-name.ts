import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolve the client name the SOW view renders into the intro section (#351).
 *
 * UI trace (must stay in sync): SOWFullView passes
 * `salesforceData?.account_data?.name || sow.clientName` to SOWIntroPage,
 * where `salesforceData` is the SOW's `sow_salesforce_data` row — fetched by
 * useSow only when the SOW has a `salesforce_account_id` — and
 * `sow.clientName` maps back to `sows.client_name`
 * (map-api-response-to-display → map-sow-response). So the rendered name is:
 *
 *   1. sow_salesforce_data.account_data.name  (when the SOW is linked to a
 *      Salesforce account and the row exists with a non-empty name)
 *   2. else sows.client_name
 *   3. else '' — SOWIntroPage then substitutes the literal `[Client Name]`
 *      (see substituteClientName in sow-content.ts).
 *
 * The GET /api/sow/[id] route actively syncs sows.client_name to the
 * Salesforce account name, so 1 and 2 normally agree — but we reproduce the
 * UI's precedence rather than rely on the sync having run.
 */
export async function resolveRenderedClientName(
  supabase: SupabaseClient,
  sowId: string,
  sow: { client_name?: unknown; salesforce_account_id?: unknown }
): Promise<string> {
  if (sow.salesforce_account_id) {
    const { data, error } = await supabase
      .from('sow_salesforce_data')
      .select('account_data')
      .eq('sow_id', sowId)
      .maybeSingle();
    if (error) {
      // Mirror the UI: a failed Salesforce-data fetch falls back to
      // sows.client_name rather than failing the caller.
      console.error('Error fetching Salesforce data for client name:', error);
    }
    const accountData = data?.account_data as
      | Record<string, unknown>
      | null
      | undefined;
    const name = accountData?.name;
    if (typeof name === 'string' && name) return name;
  }
  return typeof sow.client_name === 'string' ? sow.client_name : '';
}
