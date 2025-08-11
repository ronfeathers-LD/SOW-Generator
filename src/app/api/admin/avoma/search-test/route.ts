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

    // Test the Avoma search functionality with required date parameters
    try {
      const baseUrl = apiUrl || 'https://api.avoma.com/v1';
      
      // Get dates for the last 30 days
      const toDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
      
      const searchUrl = `${baseUrl}/calls?from_date=${fromDate}&to_date=${toDate}&limit=5`;
      
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Search test failed with status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Avoma search test successful',
        calls: searchData.results || [],
        totalCalls: searchData.count || 0
      });
    } catch (apiError) {
      console.error('Avoma search test error:', apiError);
      return NextResponse.json({ 
        error: 'Failed to test Avoma search',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing Avoma search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 