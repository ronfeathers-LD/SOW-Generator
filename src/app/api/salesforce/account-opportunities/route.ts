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
      const cachedOpportunities = salesforceCache.getCachedOpportunities(accountId);
      if (cachedOpportunities) {
    
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

    // Get opportunities for the account

    const salesforceOpportunities = await salesforceClient.getAccountOpportunities(accountId);

    // Transform Salesforce opportunity objects to match frontend expectations
    const opportunities = salesforceOpportunities.map(opportunity => {
      // Calculate if this opportunity is partner-sourced (same logic as partner-info API)
      const isPartnerSourced = !!(
        opportunity.ISV_Partner_Account__c || 
        opportunity.Partner_Account__c ||
        opportunity.Implementation_Partner__c ||
        opportunity.Date_of_Partner_Engagement__c ||
        opportunity.Channel_Partner_Contract_Amount__c
      );

      return {
        id: opportunity.Id,
        name: opportunity.Name,
        amount: opportunity.Amount,
        closeDate: opportunity.CloseDate,
        stageName: opportunity.StageName,
        description: opportunity.Description,
        // Partner fields
        isvPartnerAccount: opportunity.ISV_Partner_Account__c,
        isvPartnerAccountName: opportunity.ISV_Partner_Account__r?.Name,
        partnerAccount: opportunity.Partner_Account__c,
        partnerAccountName: opportunity.Partner_Account__r?.Name,
        implementationPartner: opportunity.Implementation_Partner__c,
        channelPartnerContractAmount: opportunity.Channel_Partner_Contract_Amount__c,
        dateOfPartnerEngagement: opportunity.Date_of_Partner_Engagement__c,
        isPartnerSourced: isPartnerSourced
      };
    });

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