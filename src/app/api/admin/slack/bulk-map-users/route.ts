import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserMappingService } from '@/lib/slack-user-mapping-service';
import { getSlackBotToken } from '@/lib/slack-bot-token';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Slack bot token from environment or database
    const botToken = await getSlackBotToken();

    if (!botToken) {
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure Slack integration first.' 
      }, { status: 400 });
    }

    // Initialize the mapping service
    SlackUserMappingService.initialize(botToken);

    // Perform bulk update
    const result = await SlackUserMappingService.bulkUpdateAllUsers();

    return NextResponse.json({
      success: true,
      message: `Bulk mapping completed. ${result.updated} users updated, ${result.failed} failed.`,
      updated: result.updated,
      failed: result.failed
    });

  } catch (error) {
    console.error('Error in bulk user mapping:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk user mapping' },
      { status: 500 }
    );
  }
}
