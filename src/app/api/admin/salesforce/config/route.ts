import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { encryptSecretIfPlain } from '@/lib/crypto-utils';
import { validateSalesforceConfigInput, stripSalesforceSecrets } from '@/lib/salesforce-config-validation';

// Build the DB columns for a validated config. Secrets are encrypted at rest (audit #92);
// getActiveSalesforceConfig transparently decrypts them on read.
function toColumns(v: Extract<ReturnType<typeof validateSalesforceConfigInput>, { ok: true }>['value']) {
  return {
    auth_method: v.authMethod,
    username: v.username,
    password: v.password ? encryptSecretIfPlain(v.password) : null,
    security_token: v.securityToken ? encryptSecretIfPlain(v.securityToken) : null,
    client_id: v.clientId,
    client_secret: v.clientSecret ? encryptSecretIfPlain(v.clientSecret) : null,
    login_url: v.loginUrl,
  };
}

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
    const supabase = await createServerSupabaseClient();
    
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No Salesforce configuration found' }, { status: 404 });
    }

    // Never return secrets in the response
    const safeConfig = stripSalesforceSecrets(config);

    // Return snake_case data directly
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
    const supabase = await createServerSupabaseClient();
    
    const body = await request.json();
    const { isActive } = body;

    const validation = validateSalesforceConfigInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Deactivate any existing configurations
    await supabase
      .from('salesforce_configs')
      .update({ is_active: false })
      .eq('is_active', true);

    const { data: config } = await supabase
      .from('salesforce_configs')
      .insert({
        ...toColumns(validation.value),
        is_active: isActive !== false, // Default to true
      })
      .select()
      .single();

    // Never return secrets in the response
    const safeConfig = stripSalesforceSecrets(config);

    // Return snake_case data directly
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
    const supabase = await createServerSupabaseClient();
    
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const validation = validateSalesforceConfigInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
    const { data: config } = await supabase
      .from('salesforce_configs')
      .update({
        ...toColumns(validation.value),
        is_active: isActive !== false,
      })
      .eq('id', id)
      .select()
      .single();

    // Never return secrets in the response
    const safeConfig = stripSalesforceSecrets(config);

    // Return snake_case data directly
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error updating Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to update Salesforce configuration' },
      { status: 500 }
    );
  }
} 