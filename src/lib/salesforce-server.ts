import type { SupabaseClient } from '@supabase/supabase-js';
import { createSalesforceClient, type SalesforceClient } from './salesforce';
import { decryptSecret } from './crypto-utils';

export interface SalesforceConfigRow {
  username: string;
  password: string;
  security_token?: string | null;
  login_url?: string | null;
  is_active?: boolean;
  [key: string]: unknown;
}

/**
 * Load the active Salesforce config and decrypt its secrets. Centralizes the
 * config-loading that was previously copy-pasted into ~14 routes (audit #67) and
 * is the single place where stored credentials are decrypted (audit #92).
 * decryptSecret is backwards-compatible with legacy plaintext values.
 */
export async function getActiveSalesforceConfig(
  supabase: SupabaseClient
): Promise<SalesforceConfigRow | null> {
  const { data, error } = await supabase
    .from('salesforce_configs')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  const config = data as SalesforceConfigRow;
  return {
    ...config,
    password: decryptSecret(config.password),
    security_token: config.security_token ? decryptSecret(config.security_token) : config.security_token,
  };
}

/**
 * Return a FRESH, authenticated SalesforceClient for this request. Never share a
 * client across requests — the connection is mutable and concurrent requests
 * would race on it. (audit #65/82/89)
 */
export async function getAuthenticatedSalesforceClient(
  supabase: SupabaseClient
): Promise<SalesforceClient> {
  const config = await getActiveSalesforceConfig(supabase);
  if (!config) {
    throw new Error('No active Salesforce configuration found');
  }

  const client = createSalesforceClient(config.login_url || undefined);
  await client.authenticate(
    config.username,
    config.password,
    config.security_token || undefined,
    config.login_url || undefined
  );
  return client;
}
