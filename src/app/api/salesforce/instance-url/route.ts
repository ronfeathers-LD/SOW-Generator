import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAuthenticatedSalesforceClient } from '@/lib/salesforce-server';

export async function GET() {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const supabase = await createServerSupabaseClient();

    // The only reliable source for the org's instance URL is the login
    // response itself (jsforce sets conn.instanceUrl from serverUrl).
    // Salesforce orgs use My Domain / pod-specific URLs, so deriving one from
    // the login URL — the old behavior returned the long-decommissioned
    // https://na1.salesforce.com — produces unreachable links. (audit #171)
    try {
      const salesforceClient = await getAuthenticatedSalesforceClient(supabase);
      const instanceUrl = salesforceClient.getInstanceUrl();
      if (instanceUrl) {
        return NextResponse.json({ instanceUrl });
      }
    } catch (authError) {
      console.error('Could not authenticate to Salesforce for instance URL:', authError);
    }

    // Fallback without authentication: a My Domain login URL *is* the
    // instance; generic login/test URLs carry no org information.
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('login_url')
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'No active Salesforce configuration found' },
        { status: 404 }
      );
    }

    const loginUrl: string = config.login_url || '';
    const isGenericLogin =
      loginUrl.includes('login.salesforce.com') || loginUrl.includes('test.salesforce.com');

    if (!isGenericLogin && /^https:\/\/[^.]+\.(my\.)?salesforce\.com/.test(loginUrl)) {
      return NextResponse.json({ instanceUrl: loginUrl.replace(/\/+$/, '') });
    }

    return NextResponse.json(
      { error: 'Salesforce instance URL unavailable (authentication failed and the login URL is generic)' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error getting Salesforce instance URL:', error);
    return NextResponse.json(
      { error: 'Failed to get Salesforce instance URL' },
      { status: 500 }
    );
  }
}
