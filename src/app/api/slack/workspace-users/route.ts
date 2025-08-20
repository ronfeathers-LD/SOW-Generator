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

    // Check if Slack bot token is configured before attempting to fetch users
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure it in Admin → Slack.',
        users: []
      }, { status: 200 }); // Return 200 with empty users array instead of error
    }

    // Get all users from Slack workspace
    const users = await SlackMentionService.getSlackWorkspaceUsers();
    
    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error fetching Slack workspace users:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch Slack workspace users',
      users: []
    }, { status: 200 }); // Return 200 with empty users array instead of error
  }
}
