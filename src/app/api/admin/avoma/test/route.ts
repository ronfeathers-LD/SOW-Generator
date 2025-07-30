import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, apiUrl } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Test the Avoma API connection using the correct endpoint with date parameters
    try {
      const baseUrl = apiUrl || 'https://api.avoma.com/v1';
      
      // Get dates for the last 30 days
      const toDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
      
      const testUrl = `${baseUrl}/calls?from_date=${fromDate}&to_date=${toDate}`;
      console.log('🔍 Testing Avoma API URL:', testUrl);
      console.log('🔍 API Key:', apiKey);
      
      const testResponse = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        throw new Error(`API test failed with status: ${testResponse.status}`);
      }

      const testData = await testResponse.json();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Avoma connection test successful',
        callCount: testData.count || 0,
        totalResults: testData.results?.length || 0
      });
    } catch (apiError) {
      console.error('Avoma API test error:', apiError);
      return NextResponse.json({ 
        error: 'Failed to connect to Avoma API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing Avoma connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 