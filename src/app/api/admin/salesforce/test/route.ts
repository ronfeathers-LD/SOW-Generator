import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import * as jsforce from 'jsforce';

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

export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    let username: string;
    let password: string;
    let security_token: string | undefined;
    let login_url: string;

    // Check if form data was sent (for testing unsaved changes)
    const body = await request.json().catch(() => null);
    
    if (body && body.useFormData) {
      // Use form data for testing
      username = body.username;
      password = body.password;
      security_token = body.securityToken;
      login_url = body.loginUrl || 'https://login.salesforce.com';
    } else {
      // Get the stored configuration from the database
      const { data: config, error: configError } = await supabase
        .from('salesforce_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (configError || !config) {
        return NextResponse.json(
          { error: 'No active Salesforce configuration found. Please save your configuration first.' },
          { status: 400 }
        );
      }

      username = config.username;
      password = config.password;
      security_token = config.security_token;
      login_url = config.login_url;
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Test the connection
    try {
      // Create a new connection with the specified login URL
      const conn = new jsforce.Connection({
        loginUrl: login_url || 'https://login.salesforce.com'
      });

      // Attempt authentication
      await conn.login(username, password + (security_token || ''));
      
      // Test a simple query
      const result = await conn.query('SELECT Id FROM User LIMIT 1');
      
      if (result.records.length === 0) {
        throw new Error('Connection test failed - no user records found');
      }

      // Update the configuration with success status
      const { data: config } = await supabase
        .from('salesforce_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (config) {
        await supabase
          .from('salesforce_configs')
          .update({
            last_tested: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', config.id);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Salesforce connection test successful' 
      });

    } catch (error) {
      // Update the configuration with error status
      const { data: config } = await supabase
        .from('salesforce_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (config) {
        await supabase
          .from('salesforce_configs')
          .update({
            last_tested: new Date().toISOString(),
            last_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', config.id);
      }

      throw error;
    }

  } catch (error) {
    console.error('Error testing Salesforce connection:', error);
    return NextResponse.json(
      { 
        error: 'Salesforce connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 