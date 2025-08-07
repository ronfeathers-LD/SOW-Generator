import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

// GET - Fetch approval workflow for a SOW
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sowId = (await params).id;

    // Get the SOW
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();

    if (sowError || !sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Get all approvals for this SOW
    const { data: approvals, error: approvalsError } = await supabase
      .from('sow_approvals')
      .select(`
        *,
        stage:approval_stages(*),
        approver:users(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: true });

    if (approvalsError) {
      console.error('Error fetching approvals:', approvalsError);
      return new NextResponse('Failed to fetch approvals', { status: 500 });
    }

    // Get approval comments
    const { data: allComments, error: commentsError } = await supabase
      .from('approval_comments')
      .select(`
        id,
        sow_id,
        user_id,
        comment,
        is_internal,
        parent_id,
        version,
        created_at,
        updated_at,
        user:users(id, name, email)
      `)
      .eq('sow_id', sowId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return new NextResponse('Failed to fetch comments', { status: 500 });
    }

    // Organize comments into a threaded structure
    const comments = allComments || [];
    const commentMap = new Map();
    const topLevelComments: any[] = [];

    // First pass: create a map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into threads
    comments.forEach(comment => {
      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentMap.get(comment.id));
      }
    });

    // Sort top-level comments by creation date
    topLevelComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Debug logging
    console.log('Approvals API - All comments:', allComments);
    console.log('Approvals API - Top level comments:', topLevelComments);

    // Get all active approval stages
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
      return new NextResponse('Failed to fetch stages', { status: 500 });
    }

    // Determine current stage and workflow status
    const currentStage = stages.find(stage => 
      !approvals.find(approval => 
        approval.stage_id === stage.id && 
        ['approved', 'skipped'].includes(approval.status)
      )
    );

    const isComplete = !currentStage;
    const nextStage = stages.find(stage => 
      stage.sort_order > (currentStage?.sort_order || 0)
    );

    // Check if current user can approve/reject
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    const canApprove = user?.role === 'admin' && currentStage && 
      !approvals.find(a => a.stage_id === currentStage.id && a.status === 'pending');
    
    const canReject = user?.role === 'admin' && currentStage;
    const canSkip = user?.role === 'admin' && currentStage?.auto_approve;

    const workflow = {
      sow_id: sowId,
      current_stage: currentStage,
      approvals: approvals || [],
      comments: topLevelComments || [],
      can_approve: canApprove,
      can_reject: canReject,
      can_skip: canSkip,
      next_stage: nextStage,
      is_complete: isComplete
    };

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching approval workflow:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Start approval workflow for a SOW
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
    }

    const sowId = (await params).id;
    const { sow_amount } = await request.json();

    // Check if workflow already exists
    const { data: existingApprovals } = await supabase
      .from('sow_approvals')
      .select('id')
      .eq('sow_id', sowId);

    if (existingApprovals && existingApprovals.length > 0) {
      return new NextResponse('Approval workflow already exists', { status: 400 });
    }

    // Get approval rules to determine required stages
    const { data: rules } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const requiredStages: string[] = [];

    // Apply rules (currently only amount-based)
    if (rules) {
      rules.forEach(rule => {
        if (rule.condition_type === 'amount') {
          const conditionValue = JSON.parse(rule.condition_value);
          if (sow_amount >= conditionValue.min_amount) {
            requiredStages.push(rule.stage_id);
          }
        }
      });
    }

    // If no rules match, use default stages
    if (requiredStages.length === 0) {
      const { data: defaultStages } = await supabase
        .from('approval_stages')
        .select('id')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3); // Default to first 3 stages

      if (defaultStages) {
        requiredStages.push(...defaultStages.map(stage => stage.id));
      }
    }

    // Create approval records
    const approvalRecords = requiredStages.map(stageId => ({
      sow_id: sowId,
      stage_id: stageId,
      status: 'pending',
      version: 1
    }));

    const { error: insertError } = await supabase
      .from('sow_approvals')
      .insert(approvalRecords);

    if (insertError) {
      console.error('Error creating approvals:', insertError);
      return new NextResponse('Failed to create approval workflow', { status: 500 });
    }

    // Update SOW status to in_review
    const { error: updateError } = await supabase
      .from('sows')
      .update({ status: 'in_review' })
      .eq('id', sowId);

    if (updateError) {
      console.error('Error updating SOW status:', updateError);
      return new NextResponse('Failed to update SOW status', { status: 500 });
    }

    return NextResponse.json({ message: 'Approval workflow started successfully' });
  } catch (error) {
    console.error('Error starting approval workflow:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 