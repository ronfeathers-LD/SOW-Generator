import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all configuration statuses in parallel
    const [avomaConfig, salesforceConfig, geminiConfig, leanDataSignators] = await Promise.all([
      supabase
        .from('avoma_configs')
        .select('is_active')
        .eq('is_active', true)
        .single()
        .then(result => ({ config: result.data, error: result.error })),
      
      supabase
        .from('salesforce_configs')
        .select('is_active')
        .eq('is_active', true)
        .single()
        .then(result => ({ config: result.data, error: result.error })),
      
      supabase
        .from('gemini_configs')
        .select('is_active')
        .eq('is_active', true)
        .single()
        .then(result => ({ config: result.data, error: result.error })),
      
      supabase
        .from('leandata_signators')
        .select('count')
        .then(result => ({ count: result.data?.length || 0, error: result.error }))
    ]);

    // Get SOW counts
    const [totalSOWs, activeSOWs] = await Promise.all([
      supabase
        .from('sows')
        .select('id', { count: 'exact' })
        .then(result => ({ count: result.count || 0, error: result.error })),
      
      supabase
        .from('sows')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .then(result => ({ count: result.count || 0, error: result.error }))
    ]);

    return NextResponse.json({
      totalSOWs: totalSOWs.count,
      activeSOWs: activeSOWs.count,
      salesforceConfigured: !!(salesforceConfig.config && salesforceConfig.config.is_active),
      avomaConfigured: !!(avomaConfig.config && avomaConfig.config.is_active),
      geminiConfigured: !!(geminiConfig.config && geminiConfig.config.is_active),
      leanDataSignators: leanDataSignators.count
    });

  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
} 