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

    // Return the actual API key for admin panel (it's secure since this is admin-only)
    return NextResponse.json({ 
      apiKey: config.api_key || '',
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



    if (!apiKey) {
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
        api_key: apiKey,
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
    
    if (apiKey !== undefined) updateData.api_key = apiKey;
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