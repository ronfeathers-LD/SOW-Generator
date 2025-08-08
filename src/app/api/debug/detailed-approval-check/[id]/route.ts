import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sowId = (await params).id;
    const results: any = {};

    // Step 1: Check SOW
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();
    
    results.sow = { data: sow, error: sowError?.message };

    // Step 2: Check approval stages (without joins)
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    results.stages = { data: stages, error: stagesError?.message };

    // Step 3: Check if assigned_user_id column exists
    try {
      const { data: testStages, error: testError } = await supabase
        .from('approval_stages')
        .select('assigned_user_id')
        .limit(1);
      
      results.assignedUserColumn = { 
        exists: !testError, 
        error: testError?.message 
      };
    } catch (e) {
      results.assignedUserColumn = { 
        exists: false, 
        error: e instanceof Error ? e.message : 'Unknown error' 
      };
    }

    // Step 4: Check approvals
    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select('*')
      .eq('sow_id', sowId);
    
    results.approvals = { data: approvals, error: approvalsError?.message };

    // Step 5: Check comments
    const { data: comments, error: commentsError } = await supabase
      .from('approval_comments')
      .select('*')
      .eq('sow_id', sowId);
    
    results.comments = { data: comments, error: commentsError?.message };

    // Step 6: Try stages with assigned_user join
    try {
      const { data: stagesWithUser, error: stagesWithUserError } = await supabase
        .from('approval_stages')
        .select(`
          *,
          assigned_user:users(id, name, email)
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      results.stagesWithUser = { 
        data: stagesWithUser, 
        error: stagesWithUserError?.message 
      };
    } catch (e) {
      results.stagesWithUser = { 
        data: null, 
        error: e instanceof Error ? e.message : 'Unknown error' 
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in detailed approval check:', error);
    return NextResponse.json({ 
      error: 'Failed to perform detailed check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
