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
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const changeType = searchParams.get('changeType') || undefined;
    const fieldName = searchParams.get('fieldName') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // If filters are provided, use filtered endpoint
    if (changeType || fieldName || userId || startDate || endDate) {
      const changelog = await ChangelogService.getFilteredChangelog(sowId, {
        changeType,
        fieldName,
        userId,
        startDate,
        endDate
      });

      return NextResponse.json(changelog);
    }

    // Otherwise, get full changelog
    const changelog = await ChangelogService.getChangelog(sowId);
    return NextResponse.json(changelog);

  } catch (error) {
    console.error('Error fetching changelog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}
