import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserLookupService } from '@/lib/slack-user-lookup';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to clear cache
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Clear the Slack user cache
    SlackUserLookupService.clearCache();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Slack user cache cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing Slack user cache:', error);
    
    return NextResponse.json({ 
      error: 'Failed to clear cache',
      success: false
    }, { status: 500 });
  }
}
