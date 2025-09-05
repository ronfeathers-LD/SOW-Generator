import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    await salesforceClient.authenticate(config.username, config.password, config.security_token || undefined, config.login_url);

    // Now query the correct field: Employee_Band__c (Account Segment Formula)
    const query = `
      SELECT Id, Name, NumberOfEmployees, Employee_Band__c
      FROM Account 
      WHERE Id = '${accountId}'
    `;
    
    const result = await salesforceClient.query(query);
    
    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const account = result.records[0];
    
    return NextResponse.json({
      success: true,
      account: {
        id: account.Id,
        name: account.Name,
        numberOfEmployees: account.NumberOfEmployees,
        employeeBand: account.Employee_Band__c
      },
      fieldInfo: {
        fieldName: 'Employee_Band__c',
        fieldLabel: 'Account Segment Formula',
        fieldType: 'string',
        isCalculated: true
      }
    });

  } catch (error) {
    console.error('Error testing Account Segment Formula field:', error);
    return NextResponse.json(
      { error: 'Failed to query Account Segment Formula field' },
      { status: 500 }
    );
  }
}
