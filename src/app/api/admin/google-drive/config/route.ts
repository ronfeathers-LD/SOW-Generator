import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/api-auth';

// Secret fields that must never be returned to the client.
const SECRET_FIELDS = ['client_secret', 'access_token', 'refresh_token'];

function stripSecrets(config: Record<string, unknown> | null) {
  if (!config) return null;
  const safe: Record<string, unknown> = { ...config };
  for (const field of SECRET_FIELDS) {
    // Replace the secret value with a boolean indicating whether it is set.
    safe[`has_${field}`] = !!safe[field];
    delete safe[field];
  }
  return safe;
}

export async function GET() {
  try {
    const auth = await requireAuth(['admin']);
    if ('error' in auth) return auth.error;

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch Google Drive configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json(stripSecrets(data));
  } catch (error) {
    console.error('Error fetching Google Drive config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(['admin']);
    if ('error' in auth) return auth.error;

    const supabase = await createServerSupabaseClient();
    const configData = await request.json();

    const { data: existingConfig } = await supabase
      .from('google_drive_configs')
      .select('id')
      .eq('is_active', true)
      .single();

    let result;
    if (existingConfig?.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('google_drive_configs')
        .update({
          ...configData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('google_drive_configs')
        .insert([{
          ...configData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(stripSecrets(result));
  } catch (error) {
    console.error('Error saving Google Drive config:', error);
    return NextResponse.json(
      { error: 'Failed to save Google Drive configuration' },
      { status: 500 }
    );
  }
}
