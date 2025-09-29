import { NextRequest, NextResponse } from 'next/server';
import { salesforceClient } from '@/lib/salesforce';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const { opportunityId = '006PL00000TTafOYAT' } = await request.json();
    
    console.log('🔐 Getting Salesforce configuration...');
    
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

    console.log('✅ Salesforce config found');

    // Initialize Salesforce client
    await salesforceClient.authenticate(
      config.username, 
      config.password, 
      config.security_token || undefined, 
      config.login_url
    );

    console.log('✅ Connected to Salesforce successfully');

    // Get Opportunity object metadata
    console.log('🔍 Getting Opportunity Object Metadata...');
    const describeResult = await salesforceClient.getConnection().describe('Opportunity');
    
    // Get Account object metadata too
    console.log('🔍 Getting Account Object Metadata...');
    const accountDescribeResult = await salesforceClient.getConnection().describe('Account');
    
    // Get the specific opportunity with basic fields
    console.log(`📋 Fetching opportunity: ${opportunityId}`);
    const opportunityQuery = `
      SELECT Id, Name, Amount, CloseDate, StageName, Description, AccountId, Account.Name,
             LeadSource, Type, OwnerId, Owner.Name, CreatedDate, LastModifiedDate
      FROM Opportunity 
      WHERE Id = '${opportunityId}'
    `;
    
    const opportunityResult = await salesforceClient.getConnection().query(opportunityQuery);
    const opportunity = opportunityResult.records[0];
    
    // Get Account information
    let accountInfo = null;
    if (opportunity?.AccountId) {
      console.log('🏢 Fetching Account Information...');
      const accountQuery = `
        SELECT Id, Name, Type, Industry, Website, Phone, OwnerId, Owner.Name,
               CreatedDate, LastModifiedDate, ParentId, Parent.Name
        FROM Account 
        WHERE Id = '${opportunity.AccountId}'
      `;
      
      const accountResult = await salesforceClient.getConnection().query(accountQuery);
      accountInfo = accountResult.records[0];
    }
    
    // Organize the data
    const opportunityFields = describeResult.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      custom: field.custom,
      length: field.length,
      required: field.nillable === false,
      defaultValue: field.defaultValue,
      value: opportunity?.[field.name] || null
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    const accountFields = accountDescribeResult.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      custom: field.custom,
      length: field.length,
      required: field.nillable === false,
      defaultValue: field.defaultValue,
      value: accountInfo?.[field.name] || null
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Find partner-related fields
    const opportunityPartnerFields = opportunityFields.filter(field => {
      const nameLower = field.name.toLowerCase();
      const labelLower = field.label.toLowerCase();
      return nameLower.includes('partner') || 
             nameLower.includes('channel') ||
             nameLower.includes('source') ||
             nameLower.includes('referral') ||
             nameLower.includes('reseller') ||
             nameLower.includes('distributor') ||
             nameLower.includes('parent') ||
             labelLower.includes('partner') ||
             labelLower.includes('channel') ||
             labelLower.includes('source') ||
             labelLower.includes('referral');
    });
    
    const accountPartnerFields = accountFields.filter(field => {
      const nameLower = field.name.toLowerCase();
      const labelLower = field.label.toLowerCase();
      return nameLower.includes('partner') || 
             nameLower.includes('channel') ||
             nameLower.includes('parent') ||
             nameLower.includes('parent_account') ||
             labelLower.includes('partner') ||
             labelLower.includes('channel') ||
             labelLower.includes('parent');
    });
    
    // Find custom fields
    const opportunityCustomFields = opportunityFields.filter(field => field.custom);
    const accountCustomFields = accountFields.filter(field => field.custom);
    
    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunity?.Id,
        name: opportunity?.Name,
        stage: opportunity?.StageName,
        accountId: opportunity?.AccountId,
        amount: opportunity?.Amount,
        closeDate: opportunity?.CloseDate,
        totalFields: opportunityFields.length,
        partnerFields: opportunityPartnerFields,
        customFields: opportunityCustomFields,
        allFields: opportunityFields
      },
      account: {
        id: accountInfo?.Id,
        name: accountInfo?.Name,
        type: accountInfo?.Type,
        industry: accountInfo?.Industry,
        totalFields: accountFields.length,
        partnerFields: accountPartnerFields,
        customFields: accountCustomFields,
        allFields: accountFields
      },
      metadata: {
        opportunityObject: {
          totalFields: describeResult.fields.length,
          customFields: describeResult.fields.filter(f => f.custom).length,
          standardFields: describeResult.fields.filter(f => !f.custom).length
        },
        accountObject: {
          totalFields: accountDescribeResult.fields.length,
          customFields: accountDescribeResult.fields.filter(f => f.custom).length,
          standardFields: accountDescribeResult.fields.filter(f => !f.custom).length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        error: 'Failed to explore Salesforce fields', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
