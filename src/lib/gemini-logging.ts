import { createServiceRoleClient } from './supabase-server';

export interface GeminiLogEntry {
  id?: string;
  created_at?: string;
  endpoint: string;
  method: string;
  customer_name: string;
  transcript_length: number;
  prompt_content: string;
  gemini_response: string;
  parsed_result?: Record<string, unknown>;
  error_message?: string;
  model_used: string;
  api_key_hash: string;
  processing_time_ms: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

export class GeminiLoggingService {
  /**
   * Log a Gemini API call with focused request/response details
   */
  static async logGeminiCall(
    endpoint: string,
    method: string,
    customerName: string,
    transcript: string,
    promptContent: string,
    geminiResponse: string,
    parsedResult: Record<string, unknown> | undefined,
    error: Error | undefined,
    modelUsed: string,
    apiKey: string,
    processingTimeMs: number
  ): Promise<void> {
    try {
      // Hash the API key for security (only store first 8 chars)
      const apiKeyHash = apiKey.substring(0, 8) + '...';
      
      // Create log entry with focused information
      const logEntry: GeminiLogEntry = {
        endpoint,
        method,
        customer_name: customerName,
        transcript_length: transcript.length,
        prompt_content: promptContent,
        gemini_response: geminiResponse,
        parsed_result: parsedResult,
        error_message: error?.message,
        model_used: modelUsed,
        api_key_hash: apiKeyHash,
        processing_time_ms: processingTimeMs,
        success: !error,
        metadata: {
          // Show transcript info without cluttering logs
          transcript_info: `[TRANSCRIPT: ${transcript.length} characters] - Full transcript available in prompt_content`,
          // Show response info
          response_length: geminiResponse.length,
          // Show parsing result info
          parsing_success: parsedResult ? 'Yes' : 'No',
          parsing_result_type: parsedResult ? typeof parsedResult : 'N/A',
          // Additional context
          error_stack: error?.stack,
          timestamp: new Date().toISOString()
        }
      };

      // Insert into database using service role client
      const supabase = createServiceRoleClient();
      const { error: insertError } = await supabase
        .from('gemini_logs')
        .insert(logEntry);
        
      if (insertError) {
        console.error('Error logging Gemini call:', insertError);
      }
      
    } catch (loggingError) {
      console.error('Error in Gemini logging service:', loggingError);
      // Don't throw here as logging should not break the main functionality
    }
  }

  /**
   * Get Gemini logs with filtering options
   */
  static async getGeminiLogs(filters: {
    customerName?: string;
    success?: boolean;
    modelUsed?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<GeminiLogEntry[]> {
    try {
      const supabase = createServiceRoleClient();
      let query = supabase
        .from('gemini_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.customerName) {
        query = query.eq('customer_name', filters.customerName);
      }
      
      if (filters.success !== undefined) {
        query = query.eq('success', filters.success);
      }
      
      if (filters.modelUsed) {
        query = query.eq('model_used', filters.modelUsed);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 100)) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching Gemini logs:', error);
        throw new Error('Failed to fetch Gemini logs');
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in Gemini logging service:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific customer
   */
  static async getCustomerLogs(customerName: string, limit: number = 10): Promise<GeminiLogEntry[]> {
    return this.getGeminiLogs({ customerName, limit });
  }

  /**
   * Get failed Gemini calls for debugging
   */
  static async getFailedCalls(limit: number = 20): Promise<GeminiLogEntry[]> {
    return this.getGeminiLogs({ success: false, limit });
  }

  /**
   * Clean up old Gemini logs (older than specified days)
   */
  static async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from('gemini_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
        
      if (error) {
        console.error('Error cleaning up old Gemini logs:', error);
        throw new Error('Failed to cleanup old Gemini logs');
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in Gemini logging cleanup:', error);
      throw error;
    }
  }
}
