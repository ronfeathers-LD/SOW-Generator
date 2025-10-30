import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import salesforceClient from '@/lib/salesforce';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    let username: string | undefined;
    let password: string | undefined;
    let securityToken: string | undefined;
    let loginUrl: string | undefined;

    // Try to read optional form data override
    try {
      const body = await request.json().catch(() => null) as
        | { username?: string; password?: string; securityToken?: string; loginUrl?: string; useFormData?: boolean }
        | null;

      if (body?.useFormData) {
        username = body.username;
        password = body.password;
        securityToken = body.securityToken;
        loginUrl = body.loginUrl;
      }
    } catch {
      // Ignore body parse errors; fall back to stored config
    }

    // If not using form data, load stored active config
    if (!username || !password) {
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

      username = config.username;
      password = config.password; // Stored encrypted/securely per app conventions
      securityToken = config.security_token || undefined;
      loginUrl = config.login_url || undefined;
    }

    // Basic validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required to test connection' },
        { status: 400 }
      );
    }

    // Attempt authentication
    await salesforceClient.authenticate(username, password, securityToken, loginUrl);

    // Double-check connection state
    if (!salesforceClient.isAuthenticated()) {
      const conn = salesforceClient.getConnection();
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


