import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { AuditService } from '@/lib/audit-service';

// GET - Fetch approval statistics for a SOW
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

    // Get approval statistics
    const stats = await AuditService.getApprovalStats(sowId);
    
    // Get audit summary for additional context
    const auditSummary = await AuditService.getAuditSummary(sowId);
    
    // Validate workflow
    const validation = await AuditService.validateWorkflow(sowId);

    return NextResponse.json({
      stats,
      auditSummary,
      validation
    });
  } catch (error) {
    console.error('Error fetching approval statistics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
