import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sowId = (await params).id;

    // Simple test - just get basic data without complex joins
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('id, title, status')
      .eq('id', sowId)
      .single();



    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('id, name, description, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select('id, stage_id, status, created_at')
      .eq('sow_id', sowId);

    return NextResponse.json({
      sow,
      stages: stages || [],
      approvals: approvals || [],
      sowError: sowError?.message,
      stagesError: stagesError?.message,
      approvalsError: approvalsError?.message
    });

  } catch (error) {
    console.error('Error in test approval API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
