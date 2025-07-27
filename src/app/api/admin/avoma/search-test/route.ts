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
    const { apiKey, apiUrl, testCustomerName } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Test the Avoma search functionality
    try {
      const searchResponse = await fetch(`${apiUrl || 'https://api.avoma.com'}/v1/calls`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // Add query parameters for search
        // Note: This is a basic test - actual search parameters may vary based on Avoma API
      });

      if (!searchResponse.ok) {
        throw new Error(`Search test failed with status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Avoma search test successful',
        calls: searchData.calls || [],
        totalCalls: searchData.total || 0
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