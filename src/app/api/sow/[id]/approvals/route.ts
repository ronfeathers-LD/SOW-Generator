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
    const topLevelComments: unknown[] = [];

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
    topLevelComments.sort((a, b) => {
      const aObj = a as { created_at: string };
      const bObj = b as { created_at: string };
      return new Date(aObj.created_at).getTime() - new Date(bObj.created_at).getTime();
    });



    // Get all active approval stages
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select(`
        *,
        assigned_user:users(id, name, email)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
      return new NextResponse('Failed to fetch stages', { status: 500 });
    }

    // Determine current stage and workflow status with sequential flow
    let currentStage = null;
    let isComplete = false;
    
    // Check if VP has approved (bypasses all other approvals)
    const vpApproval = approvals.find(approval => 
      approval.stage?.name === 'VP Approval' && approval.status === 'approved'
    );
    
    if (vpApproval) {
      // VP approval bypasses all others
      isComplete = true;
    } else {
      // Check if Director has approved (final approval after Manager)
      const directorApproval = approvals.find(approval => 
        approval.stage?.name === 'Director Approval' && approval.status === 'approved'
      );
      
      if (directorApproval) {
        // Director approved after Manager - workflow complete
        isComplete = true;
      } else {
        // Check if Manager has approved
        const managerApproval = approvals.find(approval => 
          approval.stage?.name === 'Manager Approval' && approval.status === 'approved'
        );
        
        if (managerApproval) {
          // Manager approved, now waiting for Director approval
          const directorStage = stages.find(stage => stage.name === 'Director Approval');
          if (directorStage) {
            currentStage = directorStage;
          } else {
            isComplete = true;
          }
        } else {
          // Manager hasn't approved yet
          currentStage = stages.find(stage => stage.name === 'Manager Approval');
        }
      }
    }
    
    const nextStage = stages.find(stage => 
      stage.sort_order > (currentStage?.sort_order || 0)
    );

    // Check if current user can approve/reject
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    // Check if user can approve based on hierarchical permissions
    const userRole = user?.role;
    const currentStageName = currentStage?.name;
    
    let canApprove = false;
    let canReject = false;
    let canSkip = false;
    
    if (currentStage) {
      // Check if user role matches the assigned role for the current stage
      const isAssigned = currentStage?.assigned_role === userRole;
      const isAdmin = userRole === 'admin';
      
      // VP can approve any stage and bypass all others
      if (userRole === 'vp') {
        canApprove = isAssigned || isAdmin;
        canReject = isAssigned || isAdmin;
        canSkip = isAdmin;
      }
      // Director can approve Director stage (after Manager approves)
      else if (userRole === 'director') {
        if (currentStageName === 'Director Approval') {
          canApprove = isAssigned || isAdmin;
          canReject = isAssigned || isAdmin;
          canSkip = isAdmin;
        }
      }
      // Manager can only approve Manager stage
      else if (userRole === 'manager') {
        if (currentStageName === 'Manager Approval') {
          canApprove = isAssigned || isAdmin;
          canReject = isAssigned || isAdmin;
          canSkip = isAdmin;
        }
      }
      // Admin can approve any stage
      else if (userRole === 'admin') {
        canApprove = true;
        canReject = true;
        canSkip = currentStage?.auto_approve || false;
      }
    }

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