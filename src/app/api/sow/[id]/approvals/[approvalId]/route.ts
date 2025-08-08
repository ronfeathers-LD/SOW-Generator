import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

// PATCH - Handle approval actions (approve, reject, skip)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
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

    // Check if user has appropriate role for approval
    const allowedRoles = ['admin', 'manager', 'director', 'vp'];
    if (!allowedRoles.includes(user?.role || '')) {
      return new NextResponse('Insufficient permissions for approval', { status: 403 });
    }

    const { id: sowId, approvalId } = await params;
    const { action, comments } = await request.json();

    if (!['approve', 'reject', 'skip'].includes(action)) {
      return new NextResponse('Invalid action', { status: 400 });
    }

    // Get the approval record
    const { data: approval, error: approvalError } = await supabase
      .from('sow_approvals')
      .select(`
        *,
        stage:approval_stages(*)
      `)
      .eq('id', approvalId)
      .eq('sow_id', sowId)
      .single();

    if (approvalError || !approval) {
      return new NextResponse('Approval not found', { status: 404 });
    }

    // Check if user can approve this stage based on hierarchical permissions
    const canApprove = user?.role === 'admin' || approval.stage?.assigned_role === user?.role;
    if (!canApprove) {
      return new NextResponse('You are not assigned to this approval stage', { status: 403 });
    }

    // Check hierarchical override permissions
    const userRole = user?.role;
    const stageName = approval.stage?.name;
    
    // VP can approve any stage and bypass all others
    if (userRole === 'vp') {
      // VP can approve any stage
    }
    // Director can approve Director stage (which bypasses Manager)
    else if (userRole === 'director') {
      if (stageName === 'VP Approval') {
        return new NextResponse('Director cannot approve VP stage', { status: 403 });
      }
    }
    // Manager can only approve Manager stage
    else if (userRole === 'manager') {
      if (stageName !== 'Manager Approval') {
        return new NextResponse('Manager can only approve Manager stage', { status: 403 });
      }
    }
    // Admin can approve any stage
    else if (userRole === 'admin') {
      // Admin can approve any stage
    }
    else {
      return new NextResponse('Insufficient permissions for approval', { status: 403 });
    }

    // Check if approval requires comments
    if (approval.stage?.requires_comment && !comments?.trim()) {
      return new NextResponse('Comments are required for this stage', { status: 400 });
    }

    // Update the approval record
    const updateData: Record<string, unknown> = {
      status: action,
      approver_id: user.id,
      comments: comments?.trim() || null
    };

    // Set the appropriate timestamp
    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString();
    } else if (action === 'reject') {
      updateData.rejected_at = new Date().toISOString();
    } else if (action === 'skip') {
      updateData.skipped_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('sow_approvals')
      .update(updateData)
      .eq('id', approvalId);

    if (updateError) {
      console.error('Error updating approval:', updateError);
      return new NextResponse('Failed to update approval', { status: 500 });
    }

    // If rejected, update SOW status to rejected
    if (action === 'reject') {
      const { error: sowUpdateError } = await supabase
        .from('sows')
        .update({ status: 'rejected' })
        .eq('id', sowId);

      if (sowUpdateError) {
        console.error('Error updating SOW status:', sowUpdateError);
        return new NextResponse('Failed to update SOW status', { status: 500 });
      }
    } else {
      // Check if workflow is complete based on sequential flow
      const { data: allApprovals } = await supabase
        .from('sow_approvals')
        .select(`
          status,
          stage:approval_stages(name)
        `)
        .eq('sow_id', sowId);

      if (allApprovals) {
        // Check if VP approved (bypasses all)
        const vpApproved = allApprovals.find(a => 
          (a.stage as any)?.name === 'VP Approval' && a.status === 'approved'
        );
        
        // Check if Director approved (after Manager)
        const directorApproved = allApprovals.find(a => 
          (a.stage as any)?.name === 'Director Approval' && a.status === 'approved'
        );
        
        // Check if Manager approved
        const managerApproved = allApprovals.find(a => 
          (a.stage as any)?.name === 'Manager Approval' && a.status === 'approved'
        );

        // Workflow is complete if:
        // 1. VP approved (bypasses all), OR
        // 2. Director approved after Manager approved
        const isComplete = vpApproved || (managerApproved && directorApproved);

        if (isComplete) {
          // Update SOW status to approved
          const { error: sowUpdateError } = await supabase
            .from('sows')
            .update({ status: 'approved' })
            .eq('id', sowId);

          if (sowUpdateError) {
            console.error('Error updating SOW status:', sowUpdateError);
            return new NextResponse('Failed to update SOW status', { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ message: `Approval ${action}d successfully` });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 