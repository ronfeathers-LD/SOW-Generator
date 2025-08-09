import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sowId = (await params).id;

    // Check SOW exists
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();

    if (sowError || !sow) {
      return NextResponse.json({ 
        error: 'SOW not found',
        details: sowError?.message || 'SOW does not exist'
      }, { status: 404 });
    }

    // Check approval stages
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select(`
        *,
        assigned_user:users(id, name, email)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Check approvals for this SOW
    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select(`
        *,
        stage:approval_stages(*),
        approver:users(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: true });

    // Check comments
    const { data: comments, error: commentsError } = await supabase
      .from('approval_comments')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      sow: {
        id: sow.id,
        status: sow.status,
        title: sow.title
      },
      stages: stages || [],
      approvals: approvals || [],
      comments: comments || [],
      stagesError: stagesError ? stagesError.message : null,
      approvalsError: approvalsError ? approvalsError.message : null,
      commentsError: commentsError ? commentsError.message : null
    });

  } catch (error) {
    console.error('Error checking approval workflow:', error);
    return NextResponse.json({ 
      error: 'Failed to check approval workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
