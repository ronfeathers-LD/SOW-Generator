import { NextRequest, NextResponse } from 'next/server';
import { salesforceClient } from '@/lib/salesforce';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { opportunityId } = await request.json();
    
    if (!opportunityId) {
      return NextResponse.json(
        { error: 'Opportunity ID is required' },
        { status: 400 }
      );
    }

    // Get Salesforce config from database
    const supabase = await createServerSupabaseClient();
    const { data: config, error: configError } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'No active Salesforce configuration found', details: configError?.message },
        { status: 503 }
      );
    }


    // Initialize Salesforce client
    await salesforceClient.authenticate(
      config.username, 
      config.password, 
      config.security_token || undefined, 
      config.login_url
    );


    // Get opportunity with partner information
    const opportunityQuery = `
      SELECT Id, Name, Amount, CloseDate, StageName, Description, AccountId, Account.Name,
             ISV_Partner_Account__c, ISV_Partner_Account__r.Name,
             Partner_Account__c, Partner_Account__r.Name,
             Implementation_Partner__c, Channel_Partner_Contract_Amount__c,
             Date_of_Partner_Engagement__c
      FROM Opportunity 
      WHERE Id = '${opportunityId}'
    `;
    
    const opportunityResult = await salesforceClient.getConnection().query(opportunityQuery);
    const opportunity = opportunityResult.records[0];
    
    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Get partner account information if partner account exists
    let partnerAccountInfo = null;
    const partnerAccountId = opportunity.ISV_Partner_Account__c || opportunity.Partner_Account__c;
    
    if (partnerAccountId) {
      const partnerAccountQuery = `
        SELECT Id, Name, Type, Industry, Website, Phone, OwnerId, Owner.Name,
               Partner_Account_Status__c, Partner_Type__c, Partner_Tier__c,
               Primary_Partner_Contact__c
        FROM Account 
        WHERE Id = '${partnerAccountId}'
      `;
      
      const partnerAccountResult = await salesforceClient.getConnection().query(partnerAccountQuery);
      partnerAccountInfo = partnerAccountResult.records[0];
    }
    
    // Determine if this is a partner-sourced opportunity
    const isPartnerSourced = !!(
      opportunity.ISV_Partner_Account__c || 
      opportunity.Partner_Account__c ||
      opportunity.Implementation_Partner__c ||
      opportunity.Date_of_Partner_Engagement__c ||
      opportunity.Channel_Partner_Contract_Amount__c
    );
    
    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunity.Id,
        name: opportunity.Name,
        stage: opportunity.StageName,
        accountId: opportunity.AccountId,
        accountName: opportunity.Account?.Name,
        amount: opportunity.Amount,
        closeDate: opportunity.CloseDate,
        // Partner information
        isPartnerSourced,
        partnerAccountId: opportunity.ISV_Partner_Account__c || opportunity.Partner_Account__c,
        partnerAccountName: opportunity.ISV_Partner_Account__r?.Name || opportunity.Partner_Account__r?.Name,
        implementationPartner: opportunity.Implementation_Partner__c,
        channelPartnerContractAmount: opportunity.Channel_Partner_Contract_Amount__c,
        dateOfPartnerEngagement: opportunity.Date_of_Partner_Engagement__c
      },
      partnerAccount: partnerAccountInfo ? {
        id: partnerAccountInfo.Id,
        name: partnerAccountInfo.Name,
        type: partnerAccountInfo.Type,
        industry: partnerAccountInfo.Industry,
        website: partnerAccountInfo.Website,
        phone: partnerAccountInfo.Phone,
        owner: partnerAccountInfo.Owner?.Name,
        // Partner-specific fields
        partnerStatus: partnerAccountInfo.Partner_Account_Status__c,
        partnerType: partnerAccountInfo.Partner_Type__c,
        partnerTier: partnerAccountInfo.Partner_Tier__c,
        primaryPartnerContact: partnerAccountInfo.Primary_Partner_Contact__c
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching partner info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
