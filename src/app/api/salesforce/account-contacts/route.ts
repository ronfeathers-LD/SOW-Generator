import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import salesforceCache from '@/lib/salesforce-cache';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { accountId, forceRefresh = false } = await request.json();

    

    if (!accountId) {
  
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedContacts = salesforceCache.getCachedContacts(accountId);
      if (cachedContacts) {
    
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

    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();



    if (!config) {
      
      return NextResponse.json(
        { 
          error: 'Salesforce integration is not configured',
          details: 'Please configure Salesforce in the admin panel first. Go to /admin/salesforce to set up your Salesforce credentials.'
        },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials

    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);

    // Get contacts for the account

    const contacts = await salesforceClient.getAccountContacts(accountId);


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