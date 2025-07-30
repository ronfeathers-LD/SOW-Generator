import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';
import salesforceCache from '@/lib/salesforce-cache';

export async function POST(request: NextRequest) {
  try {
    const { accountId, forceRefresh = false } = await request.json();

    console.log('🔍 Account Opportunities API Request:');
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
      const cachedOpportunities = salesforceCache.getCachedOpportunities(accountId);
      if (cachedOpportunities) {
        console.log('  Returning cached opportunities:', cachedOpportunities.length);
        return NextResponse.json({
          success: true,
          opportunities: cachedOpportunities,
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

    // Get opportunities for the account
    console.log('  Fetching opportunities for account:', accountId);
    const opportunities = await salesforceClient.getAccountOpportunities(accountId);
    console.log('  Opportunities found:', opportunities.length);

    // Cache the opportunities
    salesforceCache.cacheOpportunities(accountId, opportunities);

    return NextResponse.json({
      success: true,
      opportunities,
      cached: false
    });

  } catch (error) {
    console.error('Error getting account opportunities from Salesforce:', error);
    console.error('  Error Details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { error: 'Failed to get account opportunities from Salesforce' },
      { status: 500 }
    );
  }
} 