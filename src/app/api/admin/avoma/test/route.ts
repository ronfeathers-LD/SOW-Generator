import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveSecretInput } from '@/lib/utils/secret-mask';

/**
 * Test the Avoma connection. The admin page has always POSTed here, but the
 * route never existed (the button 404ed). Resolves a masked/blank key from
 * the form back to the stored key (audit #53), performs a minimal API call,
 * and records last_tested / last_error on the config row.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey: providedKey, apiUrl } = body;

    const supabase = await createServerSupabaseClient();
    const { data: storedConfig } = await supabase
      .from('avoma_configs')
      .select('id, api_key')
      .single();

    const apiKey = resolveSecretInput(providedKey, storedConfig?.api_key);

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const baseUrl = apiUrl || 'https://api.avoma.com/v1';

    // Minimal authenticated call: one meeting from the last 7 days.
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const testUrl = `${baseUrl}/calls?from_date=${fromDate}&to_date=${toDate}&limit=1`;

    let lastError: string | null = null;
    try {
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        lastError = `Avoma API returned status ${response.status}`;
      }
    } catch (apiError) {
      lastError = apiError instanceof Error ? apiError.message : 'Unknown error contacting Avoma';
    }

    // Record the test outcome on the config row (best effort).
    if (storedConfig?.id) {
      await supabase
        .from('avoma_configs')
        .update({ last_tested: new Date().toISOString(), last_error: lastError })
        .eq('id', storedConfig.id);
    }

    if (lastError) {
      return NextResponse.json({ error: lastError }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Avoma connection test successful' });
  } catch (error) {
    console.error('Error testing Avoma connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
