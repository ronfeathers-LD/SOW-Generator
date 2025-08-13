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
    const summary = await ChangelogService.getChangelogSummary(sowId);
    
    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching changelog summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelog summary' },
      { status: 500 }
    );
  }
}
