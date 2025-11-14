import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';

/**
 * PUT /api/sow/[id]/approvals/[approvalId]
 * Approve or reject a specific approval stage
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { id: sowId, approvalId } = await params;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { action, comments } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'approve') {
      result = await ApprovalWorkflowService.approveStage(
        sowId,
        approvalId,
        user.id,
        comments,
        user.role,
        supabase
      );
    } else {
      if (!comments?.trim()) {
        return NextResponse.json(
          { error: 'Comments are required for rejection' },
          { status: 400 }
        );
      }
      result = await ApprovalWorkflowService.rejectStage(
        sowId,
        approvalId,
        user.id,
        comments,
        user.role,
        supabase
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process approval action' },
        { status: 500 }
      );
    }

    // Return updated workflow status
    const updatedStatus = await ApprovalWorkflowService.getWorkflowStatus(
      sowId,
      supabase
    );

    return NextResponse.json({
      success: true,
      message: `Stage ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      workflow: updatedStatus
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

