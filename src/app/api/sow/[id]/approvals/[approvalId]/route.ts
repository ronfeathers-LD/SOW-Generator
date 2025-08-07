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

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
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

    // Check if approval requires comments
    if (approval.stage?.requires_comment && !comments?.trim()) {
      return new NextResponse('Comments are required for this stage', { status: 400 });
    }

    // Update the approval record
    const updateData: any = {
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
      // Check if workflow is complete (all stages approved/skipped)
      const { data: allApprovals } = await supabase
        .from('sow_approvals')
        .select('status')
        .eq('sow_id', sowId);

      const isComplete = allApprovals?.every(a => ['approved', 'skipped'].includes(a.status));

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

    return NextResponse.json({ message: `Approval ${action}d successfully` });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 