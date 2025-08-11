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
    // Import supabase dynamically to avoid issues during build
    const { supabase } = await import('@/lib/supabase');
    
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