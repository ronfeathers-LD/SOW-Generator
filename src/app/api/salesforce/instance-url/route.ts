import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('login_url')
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'No active Salesforce configuration found' },
        { status: 404 }
      );
    }

    // Convert login URL to instance URL
    // login.salesforce.com -> na1.salesforce.com
    // test.salesforce.com -> na1.salesforce.com (for sandbox)
    let instanceUrl = config.login_url;
    
    if (instanceUrl.includes('login.salesforce.com')) {
      instanceUrl = 'https://na1.salesforce.com';
    } else if (instanceUrl.includes('test.salesforce.com')) {
      instanceUrl = 'https://na1.salesforce.com';
    } else {
      // For custom domains, try to extract the instance
      const match = instanceUrl.match(/https:\/\/([^.]+)\.salesforce\.com/);
      if (match) {
        instanceUrl = `https://${match[1]}.salesforce.com`;
      }
    }

    return NextResponse.json({ instanceUrl });
  } catch (error) {
    console.error('Error getting Salesforce instance URL:', error);
    return NextResponse.json(
      { error: 'Failed to get Salesforce instance URL' },
      { status: 500 }
    );
  }
} 