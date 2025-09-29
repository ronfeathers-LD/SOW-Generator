interface AvomaApiMeeting {
  uuid: string;
  subject?: string;
  start_at?: string;
  duration?: number;
  organizer_email?: string;
  attendees?: Array<Record<string, unknown>>;
  transcription_uuid?: string;
  transcript_ready?: boolean;
  audio_ready?: boolean;
  video_ready?: boolean;
  notes_ready?: boolean;
  state?: string;
  type?: Record<string, unknown>;
  purpose?: Record<string, unknown>;
}

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
  // Meeting-specific fields
  meeting_id?: string;
  notes?: string;
  summary?: string;
  // Avoma meeting API fields
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

interface AvomaTranscript {
  id: string;
  call_id: string;
  content: string;
  transcript?: Array<Record<string, unknown>>;
  speakers: Array<{
    name: string;
    text: string;
    timestamp: number;
  }>;
}

interface AvomaSearchResponse {
  calls?: AvomaCall[];
  results?: AvomaCall[];
  count: number;
  total_count?: number;
  page?: number;
  per_page?: number;
  next?: string | null;
  previous?: string | null;
}

interface AvomaConfig {
  id: string;
  api_key: string;
  api_url: string;
  is_active: boolean;
  last_tested: Date | null;
  last_error: string | null;
  customer_id: string | null;
}

class AvomaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.avoma.com/v1';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Request details logged
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Response received

    if (!response.ok) {
      throw new Error(`Avoma API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    // Response data processed
    
    return responseData;
  }

  /**
   * Search for calls containing specific keywords
   */
  async searchCalls(query: string, customerName?: string, limit: number = 10, nextPage?: string | null): Promise<AvomaSearchResponse> {
          // Get dates for the last 6 months to ensure we capture all relevant meetings
      const toDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fromDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6 months ago
    
    
              // Date parameters prepared
    
    // Search parameters prepared
    
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

          // Always add date parameters to get meetings from the last 2 years
      params.append('from_date', fromDate);
      params.append('to_date', toDate);

    if (customerName) {
      params.append('customer_name', customerName);
    }

    // URL parameters prepared

          // Add pagination if provided
      if (nextPage) {
        // If nextPage is a full URL, use it directly
        if (nextPage.startsWith('http')) {
          // Using full pagination URL
          return this.makeRequest(nextPage.replace(this.baseUrl, ''));
        } else {
          // Otherwise, add it as a page parameter
          params.append('page', nextPage);
        }
      }
      
      // Always use the /meetings endpoint - it supports both query and date parameters
      // Using /meetings endpoint
      return this.makeRequest(`/meetings?${params.toString()}`);
  }

  /**
   * Get detailed information about a specific call
   */
  async getCall(callId: string): Promise<AvomaCall> {
    return this.makeRequest(`/calls/${callId}`);
  }

  /**
   * Get detailed information about a specific meeting by UUID
   */
  async getMeeting(meetingId: string): Promise<AvomaCall> {
    // Fetching specific meeting
    return this.makeRequest(`/meetings/${meetingId}`);
  }

  /**
   * Search meetings for specific keywords/account names
   */
  async searchMeetings(query: string, limit: number = 20): Promise<AvomaSearchResponse> {
    // Searching meetings for query
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    // Meeting search URL prepared
    return this.makeRequest(`/meetings?${params.toString()}`);
  }

  /**
   * Get the transcript for a specific call
   */
  async getCallTranscript(callId: string): Promise<AvomaTranscript> {
    return this.makeRequest(`/calls/${callId}/transcript`);
  }

  /**
   * Get the transcript for a specific meeting using the transcriptions endpoint
   */
  async getMeetingTranscript(meetingUuid: string): Promise<AvomaTranscript> {
    // Fetching meeting transcript
    
    // Use the transcriptions endpoint with the correct UUID
    const result = await this.makeRequest(`/transcriptions/${meetingUuid}/`);
    return result;
  }

  /**
   * Get full transcript text for a meeting with speaker information
   */
  async getMeetingTranscriptText(meetingUuid: string): Promise<{ text: string; speakers: Array<Record<string, unknown>> }> {
    try {
      const transcriptData = await this.getMeetingTranscript(meetingUuid);
      
      const speakers = transcriptData.speakers || [];
      let transcriptText = '';
      
      if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
        const speakerMap = new Map(speakers.map((s: Record<string, unknown>) => [s.id, s.name]));
        
        transcriptText = transcriptData.transcript
          .map((segment: Record<string, unknown>) => {
            const speakerName = speakerMap.get(segment.speaker_id) || `Speaker ${segment.speaker_id}`;
            return `${speakerName}: ${segment.transcript}`;
          })
          .join('\n\n');
      }
      
      return {
        text: transcriptText,
        speakers: speakers
      };
    } catch (error) {
      console.error('Error getting meeting transcript:', error);
      return {
        text: '',
        speakers: []
      };
    }
  }

  /**
   * Get transcript for a meeting (alias for getMeetingTranscriptText)
   */
  async getTranscript(meetingUuid: string): Promise<{ transcript: string; speakers: Array<Record<string, unknown>> }> {
    const result = await this.getMeetingTranscriptText(meetingUuid);
    return {
      transcript: result.text,
      speakers: result.speakers
    };
  }

  /**
   * Get meeting details by ID
   */
  async getMeetingDetails(meetingId: string): Promise<AvomaCall | null> {
    try {
      return await this.makeRequest(`/meetings/${meetingId}`);
    } catch (error) {
      console.error('Error getting meeting details:', error);
      return null;
    }
  }

  /**
   * Test transcriptions API with CRM filtering
   */
  async testTranscriptionsCrmFiltering(salesforceAccountId: string, fromDate: string, toDate: string): Promise<AvomaCall[]> {
    try {
      // Test 1: Basic transcriptions call
      const basicParams = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        page_size: '10'
      });
      
      const basicResult = await this.makeRequest(`/transcriptions?${basicParams.toString()}`); // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // Test 2: With CRM account ID
      const crmParams = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        page_size: '10',
        crm_account_ids: salesforceAccountId
      });
      
      const crmResult = await this.makeRequest(`/transcriptions?${crmParams.toString()}`);
      
      return crmResult;
      
    } catch (error) {
      console.error('Transcriptions API error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Test different CRM parameter names to see which one works
   */
  async testCrmParameters(salesforceAccountId: string, fromDate: string, toDate: string): Promise<void> {
    const testParams = [
      { name: 'crm_account_ids', value: salesforceAccountId },
      { name: 'crm_account_id', value: salesforceAccountId },
      { name: 'account_id', value: salesforceAccountId },
      { name: 'salesforce_account_id', value: salesforceAccountId },
      { name: 'external_account_id', value: salesforceAccountId }
    ];
    
    for (const param of testParams) {
      try {
        const params = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate,
          page_size: '10' // Small number for testing
        });
        params.append(param.name, param.value);
        
        const result = await this.makeRequest(`/meetings?${params.toString()}`); // eslint-disable-line @typescript-eslint/no-unused-vars
      } catch (error) {
        console.error(`${param.name} test failed:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  /**
   * Find meetings for a specific customer using the search endpoint
   */
  async findScopingCalls(customerName: string): Promise<AvomaCall[]> {
    try {
      // Searching for meetings with customer
      
      // Try to get meetings without the q parameter to avoid 400 errors
      // Use date parameters to get recent meetings
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const params = new URLSearchParams({
        from_date: sixMonthsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
        to_date: new Date().toISOString().split('T')[0],
        limit: '100' // Get more results to filter locally
      });

      // Fetching meetings with params
      const searchResults = await this.makeRequest(`/meetings?${params.toString()}`);
      
      // Search results received
      
      if (searchResults.results && Array.isArray(searchResults.results)) {
        // Filter for meetings that contain the customer name and scoping-related keywords
        const scopingCalls = searchResults.results.filter((meeting: AvomaCall) => {
          const subject = (meeting.subject || '').toLowerCase();
          const organizerEmail = (meeting.organizer_email || '').toLowerCase();
          const purpose = (typeof meeting.purpose === 'string' ? meeting.purpose : '').toLowerCase();
          
          // Check if customer name appears anywhere
          const hasCustomerName = subject.includes(customerName.toLowerCase()) || 
                                 organizerEmail.includes(customerName.toLowerCase()) ||
                                 purpose.includes(customerName.toLowerCase());
          
          // Check if it contains scoping-related keywords
          const hasScoping = subject.includes('scoping') || 
                            subject.includes('scope') || 
                            subject.includes('requirements') ||
                            subject.includes('discovery') ||
                            purpose.includes('scoping') ||
                            purpose.includes('scope') ||
                            purpose.includes('requirements') ||
                            purpose.includes('discovery');
          

          
          return hasCustomerName && hasScoping;
        });
        

        return scopingCalls.slice(0, 20);
      }
      
      return [];
    } catch (error) {
      console.error('Error searching for scoping calls:', error);
      return [];
    }
  }

  /**
   * Enhanced search for meetings using Salesforce account and opportunity data
   */
  async findMeetingsWithSalesforceContext(
    accountName: string,
    opportunityName?: string,
    contactEmails?: string[],
    additionalSearchTerms?: string[],
    salesforceAccountId?: string,
    salesforceOpportunityId?: string,
    fromDate?: string,
    toDate?: string,
    partnerAccountId?: string
  ): Promise<AvomaCall[]> {
    try {
      // Use provided date range or default to last 12 months
      const defaultFromDate = new Date();
      defaultFromDate.setMonth(defaultFromDate.getMonth() - 12);
      const defaultToDate = new Date();
      
      // Format dates to match Postman working format (ISO string)
      const searchFromDate = fromDate ? `${fromDate}T00:00:00` : defaultFromDate.toISOString();
      const searchToDate = toDate ? `${toDate}T23:59:59` : defaultToDate.toISOString();
      
      // Use meetings API with CRM filtering
      if (salesforceAccountId || partnerAccountId) {
        const meetingParams = new URLSearchParams({
          from_date: searchFromDate,
          to_date: searchToDate
        });

        // Add account IDs - include both customer and partner accounts
        const accountIds = [];
        if (salesforceAccountId) accountIds.push(salesforceAccountId);
        if (partnerAccountId) accountIds.push(partnerAccountId);
        
        if (accountIds.length > 0) {
          meetingParams.append('crm_account_ids', accountIds.join(','));
        }

        // Add opportunity ID if available
        if (salesforceOpportunityId) {
          meetingParams.append('crm_opportunity_ids', salesforceOpportunityId);
        }
        
        try {
          const meetingResults = await this.makeRequest(`/meetings?${meetingParams.toString()}`);
          
          if (meetingResults.results && meetingResults.results.length > 0) {
            // Convert to our expected format and filter out meetings without transcripts
            const allMeetings = meetingResults.results.map((meeting: AvomaApiMeeting) => ({
              id: meeting.uuid,
              uuid: meeting.uuid,
              title: meeting.subject || 'Untitled Meeting',
              subject: meeting.subject,
              start_at: meeting.start_at,
              duration: meeting.duration,
              organizer_email: meeting.organizer_email,
              attendees: meeting.attendees || [],
              hasTranscript: !!meeting.transcription_uuid,
              transcription_uuid: meeting.transcription_uuid,
              transcript_ready: meeting.transcript_ready,
              audio_ready: meeting.audio_ready,
              video_ready: meeting.video_ready,
              notes_ready: meeting.notes_ready,
              state: meeting.state,
              type: meeting.type?.label,
              purpose: meeting.purpose?.label
            }));
            
            // Filter to only include meetings with transcripts
            const meetingsWithTranscripts = allMeetings.filter((meeting: unknown) => {
              const meetingData = meeting as Record<string, unknown>;
              return meetingData.transcript_ready && meetingData.transcription_uuid;
            });
            
            
            return meetingsWithTranscripts;
          }
        } catch (error) {
          console.error('Meetings API error:', error instanceof Error ? error.message : String(error));
        }
      }

      // Fallback to meetings API with attendee email filtering
      const params = new URLSearchParams({
        from_date: searchFromDate,
        to_date: searchToDate,
        page_size: '100'
      });

      
      // Use attendee emails if we have contact emails
      if (contactEmails && contactEmails.length > 0) {
        params.append('attendee_emails', contactEmails.join(','));
      }

      const apiUrl = `/meetings?${params.toString()}`;
      
      try {
        const searchResults = await this.makeRequest(apiUrl);
        if (searchResults.results && Array.isArray(searchResults.results)) {
          
          const relevantMeetings = searchResults.results.filter((meeting: AvomaCall) => {
            return this.isMeetingRelevantToSalesforceContext(
              meeting,
              accountName,
              opportunityName,
              contactEmails,
              additionalSearchTerms,
              salesforceAccountId,
              salesforceOpportunityId
            );
          });



          // Sort by relevance and recency
          return this.sortMeetingsByRelevance(relevantMeetings, accountName, opportunityName).slice(0, 25);
        }
        
        return [];
      } catch (apiError) {
        console.warn('Advanced API parameters failed, falling back to basic search:', apiError);
        
        // Fallback to basic parameters if advanced ones fail
        const basicParams = new URLSearchParams({
          from_date: searchFromDate,
          to_date: searchToDate,
          page_size: '100'
        });
        
        // Still try to use CRM account ID in fallback
        if (salesforceAccountId) {
          basicParams.append('crm_account_ids', salesforceAccountId);
        }

        const fallbackResults = await this.makeRequest(`/meetings?${basicParams.toString()}`);
        
        if (fallbackResults.results && Array.isArray(fallbackResults.results)) {
          console.log(`Fallback API returned ${fallbackResults.results.length} meetings`);
          
          const relevantMeetings = fallbackResults.results.filter((meeting: AvomaCall) => {
            return this.isMeetingRelevantToSalesforceContext(
              meeting,
              accountName,
              opportunityName,
              contactEmails,
              additionalSearchTerms,
              salesforceAccountId,
              salesforceOpportunityId
            );
          });

          return this.sortMeetingsByRelevance(relevantMeetings, accountName, opportunityName).slice(0, 25);
        }
        
        return [];
      }
    } catch (error) {
      console.error('Error searching for meetings with Salesforce context:', error);
      return [];
    }
  }

  /**
   * Check if a meeting is relevant to the Salesforce context
   */
  private isMeetingRelevantToSalesforceContext(
    meeting: AvomaCall,
    accountName: string,
    opportunityName?: string,
    contactEmails?: string[],
    additionalSearchTerms?: string[],
    salesforceAccountId?: string,
    salesforceOpportunityId?: string
  ): boolean {
    const subject = (meeting.subject || '').toLowerCase();
    const organizerEmail = (meeting.organizer_email || '').toLowerCase();
    const purpose = (typeof meeting.purpose === 'string' ? meeting.purpose : '').toLowerCase();
    const attendees = meeting.attendees || [];
    
    // Extract attendee emails
    const attendeeEmails = attendees
      .map((attendee: unknown) => {
        const attendeeData = attendee as Record<string, unknown>;
        return attendeeData.email?.toString().toLowerCase();
      })
      .filter((email): email is string => Boolean(email));

    // Check for account name matches
    const hasAccountName = subject.includes(accountName.toLowerCase()) || 
                          organizerEmail.includes(accountName.toLowerCase()) ||
                          purpose.includes(accountName.toLowerCase());

    // Check for Salesforce Account ID matches (if available)
    // This could be useful if Avoma stores Salesforce IDs or if there are custom fields
    const hasSalesforceAccountId = salesforceAccountId ? 
      (subject.includes(salesforceAccountId.toLowerCase()) || 
       organizerEmail.includes(salesforceAccountId.toLowerCase()) ||
       purpose.includes(salesforceAccountId.toLowerCase())) : true;

    // Check for opportunity name matches (if provided)
    const hasOpportunityName = opportunityName ? 
      (subject.includes(opportunityName.toLowerCase()) || 
       purpose.includes(opportunityName.toLowerCase())) : true;

    // Check for Salesforce Opportunity ID matches (if available)
    const hasSalesforceOpportunityId = salesforceOpportunityId ? 
      (subject.includes(salesforceOpportunityId.toLowerCase()) || 
       organizerEmail.includes(salesforceOpportunityId.toLowerCase()) ||
       purpose.includes(salesforceOpportunityId.toLowerCase())) : true;

    // Check for contact email matches (if provided)
    const hasContactEmail = contactEmails && contactEmails.length > 0 ?
      contactEmails.some(email => 
        organizerEmail.includes(email.toLowerCase()) ||
        attendeeEmails.some(attendeeEmail => attendeeEmail.includes(email.toLowerCase()))
      ) : true;

    // Check for additional search terms (if provided)
    const hasAdditionalTerms = additionalSearchTerms && additionalSearchTerms.length > 0 ?
      additionalSearchTerms.some(term => 
        subject.includes(term.toLowerCase()) ||
        purpose.includes(term.toLowerCase())
      ) : true;

    // Check for scoping-related keywords
    const hasScopingKeywords = subject.includes('scoping') || 
                              subject.includes('scope') || 
                              subject.includes('requirements') ||
                              subject.includes('discovery') ||
                              subject.includes('project') ||
                              subject.includes('proposal') ||
                              subject.includes('sow') ||
                              purpose.includes('scoping') ||
                              purpose.includes('scope') ||
                              purpose.includes('requirements') ||
                              purpose.includes('discovery') ||
                              purpose.includes('project') ||
                              purpose.includes('proposal') ||
                              purpose.includes('sow');

    return hasAccountName && hasSalesforceAccountId && hasOpportunityName && hasSalesforceOpportunityId && hasContactEmail && 
           (hasAdditionalTerms || hasScopingKeywords);
  }

  /**
   * Sort meetings by relevance and recency
   */
  private sortMeetingsByRelevance(meetings: AvomaCall[], accountName: string, opportunityName?: string): AvomaCall[] {
    return meetings.sort((a, b) => {
      // Calculate relevance scores
      const scoreA = this.calculateRelevanceScore(a, accountName, opportunityName);
      const scoreB = this.calculateRelevanceScore(b, accountName, opportunityName);
      
      // Sort by relevance score (higher first), then by date (newer first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      const dateA = new Date(a.start_at || a.created || '');
      const dateB = new Date(b.start_at || b.created || '');
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Calculate relevance score for a meeting
   */
  private calculateRelevanceScore(meeting: AvomaCall, accountName: string, opportunityName?: string): number {
    let score = 0;
    const subject = (meeting.subject || '').toLowerCase();
    const purpose = (typeof meeting.purpose === 'string' ? meeting.purpose : '').toLowerCase();
    
    // Base score for having the account name
    if (subject.includes(accountName.toLowerCase())) score += 10;
    if (purpose.includes(accountName.toLowerCase())) score += 5;
    
    // Bonus for opportunity name match
    if (opportunityName && subject.includes(opportunityName.toLowerCase())) score += 8;
    if (opportunityName && purpose.includes(opportunityName.toLowerCase())) score += 4;
    
    // Bonus for scoping-related keywords
    const scopingKeywords = ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'];
    scopingKeywords.forEach(keyword => {
      if (subject.includes(keyword)) score += 3;
      if (purpose.includes(keyword)) score += 2;
    });
    
    // Bonus for recent meetings (within last 3 months)
    const meetingDate = new Date(meeting.start_at || meeting.created || '');
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    if (meetingDate > threeMonthsAgo) {
      score += 5;
    }
    
    return score;
  }

  /**
   * Smart search with multiple fallback strategies
   */
  async smartSearchMeetings(
    accountName: string,
    opportunityName?: string,
    contactEmails?: string[],
    additionalSearchTerms?: string[],
    salesforceAccountId?: string,
    salesforceOpportunityId?: string,
    fromDate?: string,
    toDate?: string,
    partnerAccountId?: string
  ): Promise<AvomaCall[]> {
    try {
      // Strategy 1: Full context search with optimized API parameters
      let meetings = await this.findMeetingsWithSalesforceContext(
        accountName,
        opportunityName,
        contactEmails,
        additionalSearchTerms,
        salesforceAccountId,
        salesforceOpportunityId,
        fromDate,
        toDate,
        partnerAccountId
      );

      // Strategy 2: If no results, try broader account-only search
      if (meetings.length === 0) {
        meetings = await this.findMeetingsWithSalesforceContext(
          accountName,
          undefined, // No opportunity filter
          undefined, // No contact filter
          ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'],
          salesforceAccountId,
          undefined, // No opportunity ID filter
          fromDate,
          toDate,
          partnerAccountId
        );
      }

      // Strategy 3: If still no results, try partial account name matching
      if (meetings.length === 0 && accountName.length > 3) {
        const accountWords = accountName.split(' ').filter(word => word.length > 3);
        for (const word of accountWords) {
          meetings = await this.findMeetingsWithSalesforceContext(
            word,
            undefined,
            undefined,
            ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'],
            undefined, // No account ID for partial matching
            undefined, // No opportunity ID for partial matching
            fromDate,
            toDate,
            partnerAccountId
          );
          if (meetings.length > 0) break;
        }
      }

      // Strategy 4: If still no results, try contact email search
      if (meetings.length === 0 && contactEmails && contactEmails.length > 0) {
        for (const email of contactEmails) {
          const domain = email.split('@')[1];
          if (domain) {
            meetings = await this.findMeetingsWithSalesforceContext(
              domain.split('.')[0], // Use domain name as account name
              undefined,
              [email],
              ['scoping', 'scope', 'requirements', 'discovery', 'project', 'proposal', 'sow'],
              undefined, // No account ID for domain matching
              undefined, // No opportunity ID for domain matching
              fromDate,
              toDate
            );
            if (meetings.length > 0) break;
          }
        }
      }

      return meetings;
    } catch (error) {
      console.error('Error in smart search:', error);
      return [];
    }
  }

  /**
   * Get full transcript text for a call
   */
  async getCallTranscriptText(callId: string): Promise<string> {
    try {
      const transcript = await this.getCallTranscript(callId);
      return transcript.content;
    } catch (error) {
      console.error('Error getting transcript:', error);
      return '';
    }
  }
}

/**
 * Get Avoma configuration from database
 */
async function getAvomaConfig(): Promise<AvomaConfig | null> {
  try {
    // Import server-side supabase client dynamically to avoid issues during build
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    
    const supabase = await createServerSupabaseClient();
    
    const { data: config } = await supabase
      .from('avoma_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      return null;
    }

    // Return snake_case data directly
    return {
      ...config,
      last_tested: config.last_tested ? new Date(config.last_tested) : null,
    };
  } catch (error) {
    console.error('Error getting Avoma config:', error);
    return null;
  }
}

export { AvomaClient, getAvomaConfig, type AvomaCall, type AvomaTranscript, type AvomaSearchResponse, type AvomaConfig }; 