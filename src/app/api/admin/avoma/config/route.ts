import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { maskSecret, isMaskedSecret } from '@/lib/utils/secret-mask';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: config, error } = await supabase
      .from('avoma_configs')
      .select('*')
      .single();
    
    if (error || !config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Never return the stored API key to the browser — mask it. Saving keeps
    // the stored key when the mask is round-tripped, and the test endpoints
    // resolve the stored key server-side. (audit #53)
    return NextResponse.json({ config: { ...config, api_key: maskSecret(config.api_key) } });
  } catch (error) {
    console.error('Error fetching Avoma config:', error);
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
    const { apiKey, apiUrl, isActive, customerId } = body;

    // POST creates the first config, so there is no stored key to fall back
    // to — a masked placeholder is not a usable key.
    if (!apiKey || isMaskedSecret(apiKey)) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from('avoma_configs')
      .select('*')
      .single();
    
    if (existingConfig) {
      return NextResponse.json({ error: 'Configuration already exists. Use PUT to update.' }, { status: 400 });
    }

    const { data: config, error } = await supabase
      .from('avoma_configs')
      .insert({
        api_key: apiKey,
        api_url: apiUrl || 'https://api.avoma.com/v1',
        is_active: isActive !== undefined ? isActive : true,
        customer_id: customerId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Return the config with the key masked (not stripped) so the admin form
    // keeps a truthy value and its Test buttons stay enabled after save.
    return NextResponse.json({ config: { ...config, api_key: maskSecret(config.api_key) } });
  } catch (error) {
    console.error('Error creating Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const { id, apiKey, apiUrl, isActive, customerId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Only rotate the key when a real new value was typed — the admin form
    // round-trips the masked placeholder from GET, which must not overwrite
    // the stored key. (audit #53)
    if (apiKey !== undefined && apiKey !== '' && !isMaskedSecret(apiKey)) {
      updateData.api_key = apiKey;
    }
    if (apiUrl !== undefined) updateData.api_url = apiUrl;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (customerId !== undefined) updateData.customer_id = customerId;

    const { data: config, error } = await supabase
      .from('avoma_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Return the config with the key masked (not stripped) so the admin form
    // keeps a truthy value and its Test buttons stay enabled after save.
    return NextResponse.json({ config: { ...config, api_key: maskSecret(config.api_key) } });
  } catch (error) {
    console.error('Error updating Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 