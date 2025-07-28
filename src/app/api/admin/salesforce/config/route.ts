import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { session };
}

// GET - Retrieve Salesforce configuration
export async function GET() {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No Salesforce configuration found' }, { status: 404 });
    }

    // Don't return the password in the response
    const { password, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error retrieving Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Salesforce configuration' },
      { status: 500 }
    );
  }
}

// POST - Create new Salesforce configuration
export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { username, password, securityToken, loginUrl, isActive } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Deactivate any existing configurations
    await supabase
      .from('salesforce_configs')
      .update({ is_active: false })
      .eq('is_active', true);

    // Create new configuration
    const { data: config, error } = await supabase
      .from('salesforce_configs')
      .insert({
        username,
        password,
        security_token: securityToken || null,
        login_url: loginUrl || 'https://login.salesforce.com',
        is_active: isActive !== false, // Default to true
      })
      .select()
      .single();

    // Don't return the password in the response
    const { password: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig }, { status: 201 });
  } catch (error) {
    console.error('Error creating Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to create Salesforce configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update existing Salesforce configuration
export async function PUT(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { id, username, password, securityToken, loginUrl, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Deactivate other configurations if this one is being activated
    if (isActive !== false) {
      await supabase
        .from('salesforce_configs')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id);
    }

    // Update the configuration
    const { data: config, error } = await supabase
      .from('salesforce_configs')
      .update({
        username,
        password,
        security_token: securityToken || null,
        login_url: loginUrl || 'https://login.salesforce.com',
        is_active: isActive !== false,
      })
      .eq('id', id)
      .select()
      .single();

    // Don't return the password in the response
    const { password: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error updating Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to update Salesforce configuration' },
      { status: 500 }
    );
  }
} 