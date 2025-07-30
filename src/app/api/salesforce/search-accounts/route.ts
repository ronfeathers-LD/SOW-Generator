import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json();

    console.log('🔍 Salesforce Search Request:');
    console.log('  Search Term:', searchTerm);

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    // Get stored Salesforce configuration
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    console.log('🔍 Salesforce Config:');
    console.log('  Config Found:', !!config);
    console.log('  Username:', config?.username);
    console.log('  Login URL:', config?.login_url);
    console.log('  Is Active:', config?.is_active);

    if (!config) {
      return NextResponse.json(
        { error: 'Salesforce integration is not configured' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials
    console.log('🔍 Authenticating with Salesforce...');
    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);

    // Search for accounts
    console.log('🔍 Searching for accounts...');
    const accounts = await salesforceClient.searchAccounts(searchTerm);

    console.log('🔍 Search Results:');
    console.log('  Accounts Found:', accounts.length);
    console.log('  Accounts:', accounts.map(acc => ({ Id: acc.Id, Name: acc.Name })));

    return NextResponse.json({
      success: true,
      accounts
    });

  } catch (error) {
    console.error('Error searching Salesforce accounts:', error);
    return NextResponse.json(
      { error: 'Failed to search Salesforce accounts' },
      { status: 500 }
    );
  }
} 