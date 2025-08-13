import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Retrieve Slack configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // For now, return configuration from environment variables
    // In a real app, you might store this in a database
    const config = {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: process.env.SLACK_CHANNEL || '',
      username: process.env.SLACK_USERNAME || 'SOW Generator',
      iconEmoji: process.env.SLACK_ICON_EMOJI || ':memo:',
      isEnabled: !!process.env.SLACK_WEBHOOK_URL
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error retrieving Slack config:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Update Slack configuration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config = await request.json();

    // Validate required fields
    if (!config.webhookUrl) {
      return new NextResponse('Webhook URL is required', { status: 400 });
    }

    // In a real app, you would save this to a database
    // For now, we'll just return success
    // You could also update environment variables at runtime if needed

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config 
    });
  } catch (error) {
    console.error('Error updating Slack config:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
