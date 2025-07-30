import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: config } = await supabase
      .from('salesforce_configs')
      .select('is_active, last_error')
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json({
        isConfigured: false,
        isActive: false,
        lastError: null
      });
    }

    return NextResponse.json({
      isConfigured: true,
      isActive: config.is_active,
      lastError: config.last_error
    });
  } catch (error) {
    console.error('Error checking Salesforce status:', error);
    return NextResponse.json(
      { error: 'Failed to check Salesforce status' },
      { status: 500 }
    );
  }
} 