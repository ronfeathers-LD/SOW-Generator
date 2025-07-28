import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get stored Salesforce configuration
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'Salesforce integration is not configured' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials
    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined);

    // Get full customer information
    const customerInfo = await salesforceClient.getCustomerInfo(accountId);

    return NextResponse.json({
      success: true,
      customerInfo
    });

  } catch (error) {
    console.error('Error getting customer info from Salesforce:', error);
    return NextResponse.json(
      { error: 'Failed to get customer information from Salesforce' },
      { status: 500 }
    );
  }
} 