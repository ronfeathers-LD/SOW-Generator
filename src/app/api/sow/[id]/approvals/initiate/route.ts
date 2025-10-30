import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';

/**
 * POST /api/sow/[id]/approvals/initiate
 * Initialize the multi-step approval workflow for a SOW
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

    const sowId = (await params).id;

    // Initialize the workflow
    const result = await ApprovalWorkflowService.initiateWorkflow(sowId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initiate workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error initiating approval workflow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

