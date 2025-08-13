import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sowId = (await params).id;
    
    // Reset the SOW status if it's incorrectly set to "in_review"
    await ApprovalWorkflowService.resetInvalidSOWStatus(sowId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'SOW status reset completed'
    });
    
  } catch (error) {
    console.error('Error resetting SOW status:', error);
    return NextResponse.json(
      { error: 'Failed to reset SOW status' },
      { status: 500 }
    );
  }
}
