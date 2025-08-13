import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalService } from '@/lib/approval-service';

// PATCH - Handle approval actions (approve, reject, skip)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    console.log('Approval API called with params:', await params);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('No session found');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('Session user:', session.user.email);

    const { id: sowId, approvalId } = await params;
    const { action, comments } = await request.json();

    console.log('Processing approval:', { sowId, approvalId, action, comments });

    if (!['approve', 'reject', 'skip'].includes(action)) {
      return new NextResponse('Invalid action', { status: 400 });
    }

    // Use centralized service to process approval
    await ApprovalService.processApproval(
      sowId,
      approvalId,
      action as 'approve' | 'reject' | 'skip',
      session.user.email!,
      comments
    );

    console.log('Approval processed successfully');
    return NextResponse.json({ message: `Approval ${action} successfully` });
  } catch (error) {
    console.error('Error processing approval:', error);
    
    // Return appropriate error message based on the error
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        return new NextResponse('User not found', { status: 404 });
      }
      if (error.message.includes('Approval not found')) {
        return new NextResponse('Approval not found', { status: 404 });
      }
      if (error.message.includes('Insufficient permissions')) {
        return new NextResponse('Insufficient permissions for this approval', { status: 403 });
      }
      if (error.message.includes('Comments are required')) {
        return new NextResponse('Comments are required for this stage', { status: 400 });
      }
      if (error.message.includes('Failed to update')) {
        return new NextResponse('Failed to update approval', { status: 500 });
      }
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 