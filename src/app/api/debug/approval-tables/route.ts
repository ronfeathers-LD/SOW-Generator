import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Check if approval_stages table exists
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .limit(1);

    if (stagesError) {
      console.log('approval_stages table does not exist or has error:', stagesError);
      
      // Try to create the table
      const { error: createError } = await supabase.rpc('create_approval_tables');
      
      if (createError) {
        console.log('Failed to create tables via RPC:', createError);
        
        // Manual table creation
        const { error: manualCreateError } = await supabase
          .from('approval_stages')
          .insert({
            name: 'Initial Review',
            description: 'Initial review by project manager',
            sort_order: 1,
            requires_comment: false
          });
          
        if (manualCreateError) {
          return NextResponse.json({ 
            error: 'Tables do not exist and cannot be created automatically',
            details: manualCreateError 
          });
        }
      }
    }

    // Check if sow_approvals table exists
    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select('*')
      .limit(1);

    if (approvalsError) {
      console.log('sow_approvals table does not exist:', approvalsError);
    }

    // Check if approval_comments table exists
    const { data: comments, error: commentsError } = await supabase
      .from('approval_comments')
      .select('*')
      .limit(1);

    if (commentsError) {
      console.log('approval_comments table does not exist:', commentsError);
    }

    return NextResponse.json({
      stages: stages ? 'exists' : 'missing',
      approvals: approvals ? 'exists' : 'missing',
      comments: comments ? 'exists' : 'missing',
      stagesError: stagesError?.message,
      approvalsError: approvalsError?.message,
      commentsError: commentsError?.message
    });

  } catch (error) {
    console.error('Error checking approval tables:', error);
    return NextResponse.json({ error: 'Failed to check tables' });
  }
}
