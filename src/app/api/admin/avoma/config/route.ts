import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // Return the full config including API key for admin use
    return NextResponse.json({ config });
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

    if (!apiKey) {
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

    // Don't return the actual API key in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
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
    
    if (apiKey !== undefined) updateData.api_key = apiKey;
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

    // Don't return the actual API key in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error updating Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 