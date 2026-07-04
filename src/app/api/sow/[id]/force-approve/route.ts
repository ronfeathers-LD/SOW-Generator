import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';

/**
 * Admin-only escape hatch for the approval workflow (audit #56/#63).
 * Approves every remaining stage of an in-review SOW at once, with a required
 * reason, writing consistent sow_approvals rows and an audit-log entry —
 * unlike the removed direct PUT-status bypass.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to force-approve a SOW' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json({ error: 'A reason is required to force-approve a SOW' }, { status: 400 });
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: 'Reason is too long (max 2000 characters)' }, { status: 400 });
    }

    const result = await ApprovalWorkflowService.forceApprove(id, user.id, reason, supabase);

    if (!result.success) {
      const status = result.error === 'SOW not found' ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      stages_overridden: result.stages_overridden
    });
  } catch (error) {
    console.error('Error force-approving SOW:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
