import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackMentionService } from '@/lib/slack-mention-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users from Slack workspace
    const users = await SlackMentionService.getSlackWorkspaceUsers();
    
    return NextResponse.json(users);

  } catch (error) {
    console.error('Error fetching Slack workspace users:', error);
    
    if (error instanceof Error && error.message.includes('SLACK_BOT_TOKEN not configured')) {
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure it in Admin → Slack.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch Slack workspace users' 
    }, { status: 500 });
  }
}
