import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient, getAvomaConfig, type AvomaCall } from '@/lib/avoma';
import { GeminiClient } from '@/lib/gemini';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SalesforceContact } from '@/lib/salesforce';

// Import AvomaCall interface from avoma.ts
export async function POST(request: NextRequest) {
  try {
    const { 
      customerName, 
      // New Salesforce context parameters
      accountName,
      opportunityName,
      contactEmails,
      additionalSearchTerms,
      sowId, // Optional SOW ID to fetch Salesforce data
      projectContext,
      salesforceAccountId,
      salesforceOpportunityId,
      fromDate,
      toDate
    } = await request.json();

    if (!customerName && !accountName) {
      return NextResponse.json(
        { error: 'Customer name or account name is required' },
        { status: 400 }
      );
    }

    // Get Avoma configuration from database
    const avomaConfig = await getAvomaConfig();
    
    if (!avomaConfig) {
      return NextResponse.json(
        { error: 'Avoma integration is not configured. Please contact your administrator.' },
        { status: 503 }
      );
    }

    if (!avomaConfig.is_active) {
      return NextResponse.json(
        { error: 'Avoma integration is currently disabled. Please contact your administrator.' },
        { status: 503 }
      );
    }

    // Get Gemini configuration from database
    const supabase = await createServerSupabaseClient();
    const { data: geminiConfig, error: geminiError } = await supabase
      .from('gemini_configs')
      .select('api_key, model_name, is_active')
      .eq('is_active', true)
      .single();

    if (geminiError || !geminiConfig?.api_key) {
      return NextResponse.json(
        { error: 'AI service is not properly configured. Please contact your administrator.' },
        { status: 503 }
      );
    }

    // Initialize clients
    const avomaClient = new AvomaClient(avomaConfig.api_key, avomaConfig.api_url);
    const geminiClient = new GeminiClient(geminiConfig.api_key, geminiConfig.model_name);

    // Fetch Salesforce data if SOW ID is provided
    let salesforceData = null;
    if (sowId) {
      try {
        const { data: sfData } = await supabase
          .from('sow_salesforce_data')
          .select('account_data, opportunity_data, contacts_data')
          .eq('sow_id', sowId)
          .single();
        
        if (sfData) {
          salesforceData = sfData;
        }
      } catch {
        console.log('No Salesforce data found for SOW:', sowId);
      }
    }

    // Determine search parameters
    const searchAccountName = accountName || salesforceData?.account_data?.name || customerName;
    const searchOpportunityName = opportunityName || salesforceData?.opportunity_data?.name;
    const searchContactEmails = contactEmails || salesforceData?.contacts_data?.map((contact: SalesforceContact) => contact.Email).filter(Boolean);
    const searchTerms = additionalSearchTerms || ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'];
    // Use provided IDs with priority over fetched ones
    const finalSalesforceAccountId = salesforceAccountId || salesforceData?.account_data?.id;
    const finalSalesforceOpportunityId = salesforceOpportunityId || salesforceData?.opportunity_data?.id;

    // Use enhanced search with Salesforce context
    let scopingCalls: AvomaCall[] = [];
    
    if (salesforceData || accountName || opportunityName || contactEmails) {
      // Use smart search with Salesforce context
      scopingCalls = await avomaClient.smartSearchMeetings(
        searchAccountName,
        searchOpportunityName,
        searchContactEmails,
        searchTerms,
        finalSalesforceAccountId,
        finalSalesforceOpportunityId,
        fromDate,
        toDate
      );
    } else {
      // Fallback to original search method
      scopingCalls = await avomaClient.findScopingCalls(customerName);
    }

    if (scopingCalls.length === 0) {
      return NextResponse.json({
        message: 'No scoping calls found for this customer',
        calls: [],
        bulletPoints: [],
        projectDescription: '',
        searchContext: {
          accountName: searchAccountName,
          opportunityName: searchOpportunityName,
          contactEmails: searchContactEmails,
          searchTerms: searchTerms,
          usedSalesforceData: !!salesforceData,
          salesforceAccountId: salesforceAccountId,
          salesforceOpportunityId: salesforceOpportunityId
        }
      });
    }

    // Get the most recent call transcript
    const mostRecentCall = scopingCalls[0]; // Assuming they're sorted by date
    
    if (!mostRecentCall.id) {
      return NextResponse.json({
        message: 'Call found but ID is not available',
        calls: scopingCalls,
        bulletPoints: [],
        projectDescription: ''
      });
    }
    
    const transcript = await avomaClient.getCallTranscriptText(mostRecentCall.id);

    if (!transcript) {
      return NextResponse.json({
        message: 'Call found but transcript is not available',
        calls: scopingCalls,
        bulletPoints: [],
        projectDescription: ''
      });
    }

    // Generate bullet points using Gemini
    const bulletPointsResponse = await geminiClient.generateSOWBulletPoints(
      transcript,
      customerName,
      projectContext
    );

    // Generate project description
    const projectDescription = await geminiClient.generateProjectDescription(
      transcript,
      customerName
    );

    return NextResponse.json({
      message: 'Successfully analyzed scoping calls',
      calls: scopingCalls,
      selectedCall: mostRecentCall,
      bulletPoints: bulletPointsResponse.bulletPoints,
      summary: bulletPointsResponse.summary,
      projectDescription,
      searchContext: {
        accountName: searchAccountName,
        opportunityName: searchOpportunityName,
        contactEmails: searchContactEmails,
        searchTerms: searchTerms,
        usedSalesforceData: !!salesforceData,
          salesforceAccountId: finalSalesforceAccountId,
          salesforceOpportunityId: finalSalesforceOpportunityId,
        searchMethod: salesforceData || accountName || opportunityName || contactEmails ? 'smartSearch' : 'legacySearch'
      }
    });

  } catch (error) {
    console.error('Error in Avoma search:', error);
    return NextResponse.json(
      { error: 'Failed to search Avoma calls' },
      { status: 500 }
    );
  }
} 