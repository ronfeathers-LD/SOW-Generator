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
  organization?: any;
  state?: string;
  frm?: string;
  frm_name?: string;
  to?: string;
  to_name?: string;
  recording_url?: string;
  direction?: string;
  answered?: boolean;
  additional_details?: string;
  meeting?: any;
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
  type?: any;
  outcome?: any;
  transcription_uuid?: string;
  attendees?: Array<any>;
  audio_ready?: boolean;
  video_ready?: boolean;
  transcript_ready?: boolean;
  notes_ready?: boolean;
  processing_status?: string;
  url?: string;
  recording_uuid?: string;
  purpose?: any;
}

interface AvomaTranscript {
  id: string;
  call_id: string;
  content: string;
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
    
    // Log the full request details
    console.log('🔍 Avoma API Request Details:');
    console.log('  URL:', url);
    console.log('  Method:', options.method || 'GET');
    console.log('  Headers:', {
      'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
      'Content-Type': 'application/json',
      ...options.headers,
    });
    console.log('  Body:', options.body || 'No body');
    console.log('  Full Request Object:', {
      url,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('🔍 Avoma API Response:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`Avoma API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('  Response Data:', responseData);
    
    return responseData;
  }

  /**
   * Search for calls containing specific keywords
   */
  async searchCalls(query: string, customerName?: string, limit: number = 10, nextPage?: string | null): Promise<AvomaSearchResponse> {
          // Get dates for the last 6 months to ensure we capture all relevant meetings
      const toDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fromDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6 months ago
    
    // Debug: Log the actual dates being used
          console.log('🔍 Date Debug:');
      console.log('  Current Date:', new Date().toISOString());
      console.log('  To Date (today):', toDate);
      console.log('  From Date (6 months ago):', fromDate);
    
    console.log('🔍 Building Avoma Search Parameters:');
    console.log('  Query:', query);
    console.log('  Customer Name:', customerName);
    console.log('  Limit:', limit);
    console.log('  From Date:', fromDate);
    console.log('  To Date:', toDate);
    
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

          // Always add date parameters to get meetings from the last 2 years
      params.append('from_date', fromDate);
      params.append('to_date', toDate);

    if (customerName) {
      params.append('customer_name', customerName);
    }

    console.log('🔍 Final URL Parameters:', params.toString());
    console.log('🔍 Full URL:', `${this.baseUrl}/meetings?${params.toString()}`);

          // Add pagination if provided
      if (nextPage) {
        // If nextPage is a full URL, use it directly
        if (nextPage.startsWith('http')) {
          console.log('🔍 Using full pagination URL:', nextPage);
          return this.makeRequest(nextPage.replace(this.baseUrl, ''));
        } else {
          // Otherwise, add it as a page parameter
          params.append('page', nextPage);
        }
      }
      
      // Always use the /meetings endpoint - it supports both query and date parameters
      console.log('🔍 Using /meetings endpoint with parameters:', params.toString());
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
    console.log('🔍 Fetching specific meeting:', meetingId);
    return this.makeRequest(`/meetings/${meetingId}`);
  }

  /**
   * Search meetings for specific keywords/account names
   */
  async searchMeetings(query: string, limit: number = 20): Promise<any> {
    console.log('🔍 Searching meetings for:', query);
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    console.log('🔍 Meeting search URL:', `${this.baseUrl}/meetings?${params.toString()}`);
    return this.makeRequest(`/meetings?${params.toString()}`);
  }

  /**
   * Get the transcript for a specific call
   */
  async getCallTranscript(callId: string): Promise<AvomaTranscript> {
    return this.makeRequest(`/calls/${callId}/transcript`);
  }

  /**
   * Find meetings for a specific customer using the search endpoint
   */
  async findScopingCalls(customerName: string): Promise<AvomaCall[]> {
    try {
      console.log('🔍 Searching for meetings with customer:', customerName);
      
      // Try to get meetings without the q parameter to avoid 400 errors
      // Use date parameters to get recent meetings
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const params = new URLSearchParams({
        from_date: sixMonthsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
        to_date: new Date().toISOString().split('T')[0],
        limit: '100' // Get more results to filter locally
      });

      console.log('🔍 Fetching meetings with params:', params.toString());
      const searchResults = await this.makeRequest(`/meetings?${params.toString()}`);
      
      console.log('🔍 Search results:', searchResults);
      
      if (searchResults.results && Array.isArray(searchResults.results)) {
        // Filter for meetings that contain the customer name and scoping-related keywords
        const scopingCalls = searchResults.results.filter((meeting: AvomaCall) => {
          const subject = (meeting.subject || '').toLowerCase();
          const organizerEmail = (meeting.organizer_email || '').toLowerCase();
          const purpose = typeof meeting.purpose === 'string' ? meeting.purpose.toLowerCase() : '';
          
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
          
          console.log('🔍 Meeting Analysis:', {
            uuid: meeting.uuid,
            subject: meeting.subject,
            organizer_email: meeting.organizer_email,
            purpose: meeting.purpose,
            start_at: meeting.start_at,
            hasCustomerName,
            hasScoping
          });
          
          return hasCustomerName && hasScoping;
        });
        
        console.log(`🔍 Meetings containing "${customerName}" and "scoping" keywords:`, scopingCalls.length);
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