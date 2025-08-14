import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GeminiLoggingService } from '@/lib/gemini-logging';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, allow any authenticated user to access logs
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const customerName = searchParams.get('customerName') || undefined;
    const success = searchParams.get('success') ? 
      searchParams.get('success') === 'true' : undefined;
    const modelUsed = searchParams.get('modelUsed') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? 
      parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? 
      parseInt(searchParams.get('offset')!) : 0;

    // Get Gemini logs with filters
    const logs = await GeminiLoggingService.getGeminiLogs({
      customerName,
      success,
      modelUsed,
      startDate,
      endDate,
      limit,
      offset
    });

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        total: logs.length
      }
    });

  } catch (error) {
    console.error('Error fetching Gemini logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gemini logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // TODO: Add admin role check here
    
    const { searchParams } = new URL(request.url);
    const daysToKeep = searchParams.get('daysToKeep') ? 
      parseInt(searchParams.get('daysToKeep')!) : 30;

    // Clean up old logs
    const deletedCount = await GeminiLoggingService.cleanupOldLogs(daysToKeep);

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} old Gemini logs`,
      deletedCount
    });

  } catch (error) {
    console.error('Error cleaning up Gemini logs:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup old Gemini logs' },
      { status: 500 }
    );
  }
}
