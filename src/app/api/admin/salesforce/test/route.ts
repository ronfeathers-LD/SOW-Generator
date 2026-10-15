import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createSalesforceClient } from '@/lib/salesforce';
import { requireAuth } from '@/lib/api-auth';
import { decryptSecret } from '@/lib/crypto-utils';

export async function POST(request: NextRequest) {
  try {
    // Admin only — performs Salesforce login attempts with stored/arbitrary creds.
    const auth = await requireAuth(['admin']);
    if ('error' in auth) return auth.error;

    const supabase = await createServerSupabaseClient();

    let authMethod: 'password' | 'client_credentials' = 'password';
    let username: string | undefined;
    let password: string | undefined;
    let securityToken: string | undefined;
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let loginUrl: string | undefined;

    // Try to read optional form data override
    try {
      const body = await request.json().catch(() => null) as
        | {
            authMethod?: string;
            username?: string;
            password?: string;
            securityToken?: string;
            clientId?: string;
            clientSecret?: string;
            loginUrl?: string;
            useFormData?: boolean;
          }
        | null;

      if (body?.useFormData) {
        authMethod = body.authMethod === 'client_credentials' ? 'client_credentials' : 'password';
        username = body.username;
        password = body.password ? decryptSecret(body.password) : undefined;
        // The form round-trips the stored token, which may be encrypted
        securityToken = body.securityToken ? decryptSecret(body.securityToken) : undefined;
        clientId = body.clientId;
        clientSecret = body.clientSecret ? decryptSecret(body.clientSecret) : undefined;
        loginUrl = body.loginUrl;
      }
    } catch {
      // Ignore body parse errors; fall back to stored config
    }

    // If the form data lacks the secret for its method, load the stored active config
    const formComplete =
      authMethod === 'client_credentials'
        ? !!(username && clientId && clientSecret)
        : !!(username && password);
    if (!formComplete) {
      const { data: config, error } = await supabase
        .from('salesforce_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error || !config) {
        return NextResponse.json(
          { error: 'No active Salesforce configuration found' },
          { status: 400 }
        );
      }

      authMethod = config.auth_method === 'client_credentials' ? 'client_credentials' : 'password';
      username = config.username;
      password = config.password ? decryptSecret(config.password) : undefined; // decrypt stored secret (audit #92)
      securityToken = config.security_token ? decryptSecret(config.security_token) : undefined;
      clientId = config.client_id || undefined;
      clientSecret = config.client_secret ? decryptSecret(config.client_secret) : undefined;
      loginUrl = config.login_url || undefined;
    }

    // Fresh client per test so state from a previous test can't leak into this one
    const client = createSalesforceClient(loginUrl);

    if (authMethod === 'client_credentials') {
      if (!clientId || !clientSecret || !loginUrl) {
        return NextResponse.json(
          { error: 'Consumer key, consumer secret and login URL are required to test connection' },
          { status: 400 }
        );
      }
      await client.authenticateWithClientCredentials(clientId, clientSecret, loginUrl);
    } else {
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required to test connection' },
          { status: 400 }
        );
      }
      await client.authenticate(username, password, securityToken, loginUrl);
    }

    // Double-check connection state
    if (!client.isAuthenticated()) {
      const conn = client.getConnection();
      return NextResponse.json(
        {
          error: 'Authenticated but connection not established',
          details: `Instance URL: ${conn.instanceUrl ? 'present' : 'missing'}, Access Token: ${conn.accessToken ? 'present' : 'missing'}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Salesforce test failed', details: message }, { status: 500 });
  }
}
