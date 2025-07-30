import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';
import salesforceCache from '@/lib/salesforce-cache';

export async function POST(request: NextRequest) {
  try {
    const { accountId, forceRefresh = false } = await request.json();

    console.log('🔍 Account Contacts API Request:');
    console.log('  Account ID:', accountId);
    console.log('  Force Refresh:', forceRefresh);

    if (!accountId) {
      console.log('  Error: Account ID is required');
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedContacts = salesforceCache.getCachedContacts(accountId);
      if (cachedContacts) {
        console.log('  Returning cached contacts:', cachedContacts.length);
        return NextResponse.json({
          success: true,
          contacts: cachedContacts,
          cached: true
        });
      }
    }

    // Clear cache if force refresh is requested
    if (forceRefresh) {
      salesforceCache.forceRefresh(accountId);
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
        { 
          error: 'Salesforce integration is not configured',
          details: 'Please configure Salesforce in the admin panel first. Go to /admin/salesforce to set up your Salesforce credentials.'
        },
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

    // Cache the contacts
    salesforceCache.cacheContacts(accountId, contacts);

    return NextResponse.json({
      success: true,
      contacts,
      cached: false
    });

  } catch (error) {
    console.error('Error getting account contacts from Salesforce:', error);
    return NextResponse.json(
      { error: 'Failed to get account contacts from Salesforce' },
      { status: 500 }
    );
  }
} 