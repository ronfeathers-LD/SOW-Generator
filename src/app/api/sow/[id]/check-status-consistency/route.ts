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
    
    // Check and fix status consistency
    await ApprovalWorkflowService.checkAndFixStatusConsistency(sowId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status consistency check completed' 
    });
    
  } catch (error) {
    console.error('Error checking status consistency:', error);
    return NextResponse.json(
      { error: 'Failed to check status consistency' },
      { status: 500 }
    );
  }
}
