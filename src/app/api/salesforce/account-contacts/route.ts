import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    console.log('🔍 Account Contacts API Request:');
    console.log('  Account ID:', accountId);

    if (!accountId) {
      console.log('  Error: Account ID is required');
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get stored Salesforce configuration
    console.log('  Getting Salesforce config...');
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    console.log('  Config found:', !!config);
    console.log('  Config active:', config?.is_active);

    if (!config) {
      console.log('  Error: Salesforce integration is not configured');
      return NextResponse.json(
        { error: 'Salesforce integration is not configured' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials
    console.log('  Authenticating with Salesforce...');
    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);

    // Get contacts for the account
    console.log('  Fetching contacts for account:', accountId);
    const contacts = await salesforceClient.getAccountContacts(accountId);
    console.log('  Contacts found:', contacts.length);

    return NextResponse.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('Error getting account contacts from Salesforce:', error);
    console.error('  Error Details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { error: 'Failed to get account contacts from Salesforce' },
      { status: 500 }
    );
  }
} 