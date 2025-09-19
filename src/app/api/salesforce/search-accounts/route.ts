import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    const salesforceAccounts = await salesforceClient.searchAccounts(searchTerm);

    // Return accounts in the format expected by the frontend
    const accounts = salesforceAccounts.map(account => ({
      Id: account.Id,
      Name: account.Name,
      BillingCity: account.BillingCity,
      BillingState: account.BillingState,
      BillingCountry: account.BillingCountry,
      Industry: account.Industry,
      NumberOfEmployees: account.NumberOfEmployees,
      Employee_Band__c: account.Employee_Band__c,
      Owner: account.Owner,
      // Also include lowercase versions for compatibility
      id: account.Id,
      name: account.Name,
      billingCity: account.BillingCity,
      billingState: account.BillingState,
      billingCountry: account.BillingCountry,
      industry: account.Industry,
      numberOfEmployees: account.NumberOfEmployees,
      accountSegment: account.Employee_Band__c,
      owner: account.Owner
    }));

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