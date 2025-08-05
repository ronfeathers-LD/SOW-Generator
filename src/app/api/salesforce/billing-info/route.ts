import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get Salesforce configuration
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .single();
    if (!config) {
      return NextResponse.json({ error: 'Salesforce not configured' }, { status: 503 });
    }

    // Authenticate with Salesforce
    await salesforceClient.authenticate(
      config.username,
      config.password,
      config.security_token || undefined,
      config.login_url
    );

    // Get billing information
    const billingInfo = await salesforceClient.getAccountBillingInfo(accountId);

    return NextResponse.json({ billingInfo });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    
    // Provide more specific error information
    let errorMessage = 'Failed to fetch billing information';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 