import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sowId = (await params).id;

    // Get all approvals for this SOW
    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select(`
        *,
        stage:approval_stages(*)
      `)
      .eq('sow_id', sowId);

    // Get all stages
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      sowId,
      approvals: approvals || [],
      stages: stages || [],
      approvalsError: approvalsError?.message,
      stagesError: stagesError?.message
    });

  } catch (error) {
    console.error('Error checking SOW approvals:', error);
    return NextResponse.json({ error: 'Failed to check approvals' });
  }
}
