import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { AuditService } from '@/lib/audit-service';

// GET - Fetch audit trail for a SOW
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
    const { searchParams } = new URL(request.url);
    
    // Get query parameters for filtering
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const exportCsv = searchParams.get('export') === 'csv';

    // If export is requested, return CSV
    if (exportCsv) {
      const csvData = await AuditService.exportAuditTrail(sowId);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-trail-${sowId}.csv"`
        }
      });
    }

    // Get filtered audit trail
    const auditTrail = await AuditService.getFilteredAuditTrail(sowId, {
      action: action || undefined,
      userId: userId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });

    return NextResponse.json(auditTrail);
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
