import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient, getAvomaConfig } from '@/lib/avoma';
import { GeminiClient } from '@/lib/gemini';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SalesforceContact } from '@/lib/salesforce';

// Import AvomaCall interface from avoma.ts
interface AvomaCall {
  id?: string;
  external_id?: string;
  title?: string;
  customer_name?: string;
  meeting_date?: string;
  start_at?: string;
  end_at?: string;
  duration?: number;
  participants?: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  organization?: Record<string, unknown>;
  state?: string;
  frm?: string;
  frm_name?: string;
  to?: string;
  to_name?: string;
  recording_url?: string;
  direction?: string;
  answered?: boolean;
  additional_details?: string;
  meeting?: Record<string, unknown>;
  is_voicemail?: boolean;
  source?: string;
  user_email?: string;
  meeting_id?: string;
  notes?: string;
  summary?: string;
  uuid?: string;
  subject?: string;
  organizer_email?: string;
  created?: string;
  modified?: string;
  is_internal?: boolean;
  is_private?: boolean;
  is_call?: boolean;
  type?: Record<string, unknown>;
  outcome?: Record<string, unknown>;
  transcription_uuid?: string;
  attendees?: Array<Record<string, unknown>>;
  audio_ready?: boolean;
  video_ready?: boolean;
  transcript_ready?: boolean;
  notes_ready?: boolean;
  processing_status?: string;
  url?: string;
  recording_uuid?: string;
  purpose?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      sowId,
      accountName,
      opportunityName,
      contactEmails,
      additionalSearchTerms,
      useSmartSearch = true,
      salesforceAccountId,
      salesforceOpportunityId,
      fromDate,
      toDate,
      projectContext // eslint-disable-line @typescript-eslint/no-unused-vars
    } = await request.json();

    if (!sowId && !accountName) {
      return NextResponse.json(
        { error: 'SOW ID or account name is required' },
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
    const geminiClient = new GeminiClient(geminiConfig.api_key, geminiConfig.model_name); // eslint-disable-line @typescript-eslint/no-unused-vars

    // Fetch Salesforce data if SOW ID is provided
    let salesforceData = null;
    let sowData = null;
    
    if (sowId) {
      try {
        // Get SOW data
        const { data: sow } = await supabase
          .from('sows')
          .select('*')
          .eq('id', sowId)
          .eq('is_hidden', false)
          .single();
        
        if (sow) {
          sowData = sow;
        }

        // Get Salesforce data
        const { data: sfData } = await supabase
          .from('sow_salesforce_data')
          .select('account_data, opportunity_data, contacts_data')
          .eq('sow_id', sowId)
          .single();
        
        if (sfData) {
          salesforceData = sfData;
        }
      } catch (error) {
        console.log('Error fetching SOW or Salesforce data:', error);
      }
    }

    // Determine search parameters with priority order
    const searchAccountName = accountName || 
                             salesforceData?.account_data?.name || 
                             sowData?.header?.client_name || 
                             'Unknown Account';
    
    const searchOpportunityName = opportunityName || 
                                  salesforceData?.opportunity_data?.name;
    
    const searchContactEmails = contactEmails || 
                                salesforceData?.contacts_data?.map((contact: SalesforceContact) => contact.Email).filter(Boolean);
    
    const searchTerms = additionalSearchTerms || 
                       ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'];

    // Use provided IDs with priority over fetched ones
    const finalSalesforceAccountId = salesforceAccountId || salesforceData?.account_data?.id;
    const finalSalesforceOpportunityId = salesforceOpportunityId || salesforceData?.opportunity_data?.id;
    

    // Perform enhanced search
    let meetings: AvomaCall[] = [];
    
    if (useSmartSearch) {
      meetings = await avomaClient.smartSearchMeetings(
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
      meetings = await avomaClient.findMeetingsWithSalesforceContext(
        searchAccountName,
        searchOpportunityName,
        searchContactEmails,
        searchTerms,
        finalSalesforceAccountId,
        finalSalesforceOpportunityId,
        fromDate,
        toDate
      );
    }

    if (meetings.length === 0) {
      return NextResponse.json({
        message: 'No relevant meetings found',
        meetings: [],
        searchContext: {
          accountName: searchAccountName,
          opportunityName: searchOpportunityName,
          contactEmails: searchContactEmails,
          searchTerms: searchTerms,
          usedSalesforceData: !!salesforceData,
          usedSOWData: !!sowData,
          salesforceAccountId: finalSalesforceAccountId,
          salesforceOpportunityId: finalSalesforceOpportunityId,
          searchMethod: useSmartSearch ? 'smartSearch' : 'contextSearch'
        }
      });
    }

    
    return NextResponse.json({
      message: `Found ${meetings.length} meetings with transcripts available for analysis.`,
      meetings: meetings,
      selectedMeeting: null, // No automatic selection
      meetingTranscripts: [], // No transcripts fetched yet
      bulletPoints: [], // No analysis yet
      summary: '', // No summary yet
      projectDescription: '', // No description yet
      searchContext: {
        accountName: searchAccountName,
        opportunityName: searchOpportunityName,
        contactEmails: searchContactEmails,
        searchTerms: searchTerms,
        usedSalesforceData: !!salesforceData,
        usedSOWData: !!sowData,
        salesforceAccountId: finalSalesforceAccountId,
        salesforceOpportunityId: finalSalesforceOpportunityId,
        searchMethod: useSmartSearch ? 'smartSearch' : 'contextSearch',
        totalMeetingsFound: meetings.length,
        meetingsWithTranscripts: meetings.length // All meetings have transcripts
      }
    });

  } catch (error) {
    console.error('Error in enhanced Avoma search:', error);
    return NextResponse.json(
      { error: 'Failed to perform enhanced Avoma search' },
      { status: 500 }
    );
  }
}
