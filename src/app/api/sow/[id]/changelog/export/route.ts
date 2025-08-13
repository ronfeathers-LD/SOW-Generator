import { NextResponse } from 'next/server';
import { ChangelogService } from '@/lib/changelog-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sowId } = await params;
    const csvData = await ChangelogService.exportChangelog(sowId);
    
    // Return CSV with proper headers
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sow-${sowId}-changelog.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting changelog:', error);
    return NextResponse.json(
      { error: 'Failed to export changelog' },
      { status: 500 }
    );
  }
}
