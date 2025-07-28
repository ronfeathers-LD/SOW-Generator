import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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
    const body = await request.json();
    const { username, password, securityToken, loginUrl } = body;

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
        loginUrl: loginUrl || 'https://login.salesforce.com'
      });

      // Attempt authentication
      await conn.login(username, password + (securityToken || ''));
      
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