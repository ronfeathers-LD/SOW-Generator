import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';

/**
 * GET /api/sow/[id]/approvals
 * Get the current approval workflow status for a SOW
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sowId = (await params).id;

    const status = await ApprovalWorkflowService.getWorkflowStatus(sowId);

    if (!status) {
      return NextResponse.json(
        { error: 'No approval workflow found for this SOW' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching approval status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

