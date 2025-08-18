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
    console.log('Fetching Salesforce configuration from database...');
    
    const { data: config, error: configError } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError) {
      console.error('Error fetching Salesforce config:', configError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch Salesforce configuration',
          details: configError.message
        },
        { status: 500 }
      );
    }



    if (!config) {
      console.error('No active Salesforce configuration found');
      return NextResponse.json(
        { 
          error: 'Salesforce integration is not configured',
          details: 'Please configure Salesforce in the admin panel first. Go to /admin/salesforce to set up your Salesforce credentials.'
        },
        { status: 400 }
      );
    }

    console.log('Salesforce config found:', {
      hasUsername: !!config.username,
      hasPassword: !!config.password,
      hasSecurityToken: !!config.security_token,
      loginUrl: config.login_url,
      isActive: config.is_active
    });

    // Authenticate with Salesforce using stored credentials
    console.log('Authenticating with Salesforce using login URL:', config.login_url);
    try {
      await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);
    } catch (authError) {
      console.error('Salesforce authentication error:', authError);
      return NextResponse.json(
        { 
          error: 'Salesforce authentication failed',
          details: authError instanceof Error ? authError.message : 'Unknown authentication error'
        },
        { status: 500 }
      );
    }

    // Verify authentication was successful
    if (!salesforceClient.isAuthenticated()) {
      console.error('Salesforce authentication failed - connection not properly established');
      return NextResponse.json(
        { error: 'Salesforce authentication failed - connection not properly established after successful authentication' },
        { status: 500 }
      );
    }

    console.log('Salesforce authentication successful, instance URL:', salesforceClient.getInstanceUrl());

    // Get contacts for the account
    console.log('Fetching contacts for account:', accountId);
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
    
    // Provide more detailed error information
    let errorMessage = 'Failed to get account contacts from Salesforce';
    let errorDetails = 'Check the server logs for more information about the Salesforce connection issue.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more specific error details based on the error type
      if (error.message.includes('instance URL')) {
        errorDetails = 'Salesforce authentication succeeded but instance URL could not be determined. This may be due to custom domain configuration.';
      } else if (error.message.includes('INVALID_LOGIN')) {
        errorDetails = 'Invalid Salesforce credentials. Please check your username, password, and security token.';
      } else if (error.message.includes('INSUFFICIENT_ACCESS')) {
        errorDetails = 'Insufficient access to Salesforce. Please check your user permissions.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorDetails = 'Network connection issue. Please check your internet connection and Salesforce accessibility.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 