import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSlackService } from '@/lib/slack';

// POST - Test Slack connection
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const slackService = await getSlackService();
    if (!slackService) {
      return new NextResponse('Slack service not configured', { status: 400 });
    }

    // Send a test message
    const success = await slackService.sendMessage(
      '🧪 This is a test message from your SOW Generator! If you see this, your Slack integration is working correctly.',
      process.env.SLACK_CHANNEL
    );

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test message sent successfully' 
      });
    } else {
      return new NextResponse('Failed to send test message', { status: 500 });
    }
  } catch (error) {
    console.error('Error testing Slack connection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
