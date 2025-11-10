import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSlackService } from '@/lib/slack';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slackService = await getSlackService();
    if (!slackService) {
      return NextResponse.json(
        {
          error: 'Slack service not configured. Please save a valid webhook URL before testing.'
        },
        { status: 400 }
      );
    }

    const sent = await slackService.sendMessage(
      ':white_check_mark: Slack integration test message from the SOW Generator admin panel.'
    );

    if (!sent) {
      return NextResponse.json(
        {
          error: 'Failed to deliver test message. Verify that the webhook URL is correct and reachable.'
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully'
    });
  } catch (error) {
    console.error('Error sending Slack test message:', error);
    return NextResponse.json(
      { error: 'Internal server error while sending Slack test message' },
      { status: 500 }
    );
  }
}

