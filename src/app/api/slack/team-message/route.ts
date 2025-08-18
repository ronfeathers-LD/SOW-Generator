import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSlackService } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, mentions, channel, title } = await request.json();

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required and must be a string' }, { status: 400 });
    }

    // Validate mentions array
    if (mentions && (!Array.isArray(mentions) || !mentions.every(m => typeof m === 'string'))) {
      return NextResponse.json({ error: 'Mentions must be an array of strings' }, { status: 400 });
    }

    // Get Slack service
    const slackService = await getSlackService();
    if (!slackService) {
      return NextResponse.json({ error: 'Slack service not configured' }, { status: 500 });
    }

    // Send the team message
    const success = await slackService.sendTeamMessage(
      message,
      mentions || [],
      channel,
      title
    );

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Team message sent successfully',
        mentions: mentions || []
      });
    } else {
      return NextResponse.json({ error: 'Failed to send team message' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending team message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
