import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { maskSecret, resolveSecretInput } from '@/lib/utils/secret-mask';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: config, error } = await supabase
      .from('gemini_configs')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error || !config) {
      return NextResponse.json({ 
        apiKey: '',
        isConfigured: false 
      });
    }

    // Never return the stored API key to the browser — mask it. Save resolves
    // the mask back to the stored key, and the test endpoint already does via
    // resolveGeminiTestKey. (audit #53)
    return NextResponse.json({
      apiKey: maskSecret(config.api_key),
      modelName: config.model_name || 'gemini-1.5-flash',
      isConfigured: true
    });
  } catch (error) {
    console.error('Error fetching Gemini config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, modelName, isActive } = body;

    // The admin form round-trips the masked placeholder from GET when the
    // user hasn't re-typed the key (e.g. only changing the model). Resolve a
    // masked/blank value back to the stored active key so saving never
    // overwrites the real key with the mask. (audit #53)
    const { data: activeConfig } = await supabase
      .from('gemini_configs')
      .select('api_key')
      .eq('is_active', true)
      .single();

    const resolvedApiKey = resolveSecretInput(apiKey, activeConfig?.api_key);

    if (!resolvedApiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Deactivate any existing configurations
    await supabase
      .from('gemini_configs')
      .update({ is_active: false })
      .eq('is_active', true);



    // Create new configuration
    const { data: config, error } = await supabase
      .from('gemini_configs')
      .insert({
        api_key: resolvedApiKey,
        model_name: modelName || 'gemini-1.5-flash',
        is_active: isActive !== undefined ? isActive : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: 'Database error: ' + error.message,
        details: error.details 
      }, { status: 500 });
    }



    // Don't return the actual API key in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key: _ } = config;
    
    return NextResponse.json({ 
      apiKey: '••••••••••••••••',
      isConfigured: true 
    });
  } catch (error) {
    console.error('Error creating Gemini config:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, apiKey, modelName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Only rotate the key when a real new value was typed — a masked/blank
    // round-trip from the form must not overwrite the stored key. (audit #53)
    const resolvedApiKey = resolveSecretInput(apiKey, undefined);
    if (resolvedApiKey !== null) updateData.api_key = resolvedApiKey;
    if (modelName !== undefined) updateData.model_name = modelName;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: config, error } = await supabase
      .from('gemini_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Don't return the actual API key in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key: _ } = config;
    
    return NextResponse.json({ 
      apiKey: '••••••••••••••••',
      isConfigured: true 
    });
  } catch (error) {
    console.error('Error updating Gemini config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 