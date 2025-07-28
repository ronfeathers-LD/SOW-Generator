interface AvomaCall {
  id: string;
  title: string;
  customer_name: string;
  meeting_date: string;
  duration: number;
  participants: Array<{
    name: string;
    email: string;
    role: string;
  }>;
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
  calls: AvomaCall[];
  total_count: number;
  page: number;
  per_page: number;
}

interface AvomaConfig {
  id: string;
  apiKey: string;
  apiUrl: string;
  isActive: boolean;
  lastTested: Date | null;
  lastError: string | null;
  customerId: string | null;
}

class AvomaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://dev694.avoma.com/api/v1';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Avoma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for calls containing specific keywords
   */
  async searchCalls(query: string, customerName?: string, limit: number = 10): Promise<AvomaSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    if (customerName) {
      params.append('customer_name', customerName);
    }

    return this.makeRequest(`/calls/search?${params.toString()}`);
  }

  /**
   * Get detailed information about a specific call
   */
  async getCall(callId: string): Promise<AvomaCall> {
    return this.makeRequest(`/calls/${callId}`);
  }

  /**
   * Get the transcript for a specific call
   */
  async getTranscript(callId: string): Promise<AvomaTranscript> {
    return this.makeRequest(`/calls/${callId}/transcript`);
  }

  /**
   * Find calls for a specific customer that mention scoping
   */
  async findScopingCalls(customerName: string): Promise<AvomaCall[]> {
    try {
      const response = await this.searchCalls('scoping', customerName, 20);
      return response.calls;
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
      const transcript = await this.getTranscript(callId);
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
        .single();
    return config;
  } catch (error) {
    console.error('Error getting Avoma config:', error);
    return null;
  }
}

export { AvomaClient, getAvomaConfig, type AvomaCall, type AvomaTranscript, type AvomaSearchResponse, type AvomaConfig }; 