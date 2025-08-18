import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Test Slack bot token
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { botToken } = await request.json();

    if (!botToken) {
      return new NextResponse('Bot token is required', { status: 400 });
    }

    // Test the bot token by calling Slack's auth.test endpoint
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Bot token is valid',
          workspace: {
            name: data.team,
            domain: data.team_domain,
            botName: data.user,
            botId: data.user_id
          }
        });
      } else {
        return new NextResponse(data.error || 'Bot token validation failed', { status: 400 });
      }
    } catch (error) {
      console.error('Error testing bot token:', error);
      return new NextResponse('Failed to validate bot token', { status: 500 });
    }

  } catch (error) {
    console.error('Error in bot token test:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
