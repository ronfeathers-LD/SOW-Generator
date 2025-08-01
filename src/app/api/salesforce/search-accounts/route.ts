import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json();

      // Salesforce search request

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

    // Salesforce config loaded

    if (!config) {
      return NextResponse.json(
        { error: 'Salesforce integration is not configured' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials
    // Authenticating with Salesforce
    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);

    // Search for accounts
    // Searching for accounts
    const accounts = await salesforceClient.searchAccounts(searchTerm);

    // Search results processed

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