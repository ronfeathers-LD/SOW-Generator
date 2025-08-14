import { NextRequest } from 'next/server';
import { supabase } from './supabase';

export async function logRequest(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Get request body
    let body = {};
    try {
      const clonedRequest = request.clone();
      const bodyText = await clonedRequest.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch {
      body = { _error: 'Could not parse body' };
    }
    
    // Get headers (filter sensitive ones)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headers[key] = value;
      } else {
        headers[key] = '[REDACTED]';
      }
    });
    
    // Log to database
    await supabase
      .from('api_logs')
      .insert({
        endpoint: url.pathname,
        method: request.method,
        request_headers: headers,
        request_body: body,
        request_query: Object.fromEntries(url.searchParams),
        created_at: new Date().toISOString()
      });
      
  } catch (error) {
    console.error('Failed to log request:', error);
  }
}
