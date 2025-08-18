import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSlackService } from '@/lib/slack';
import { SlackMentionService } from '@/lib/slack-mention-service';
import { createServiceRoleClient } from '@/lib/supabase-server';

// GET - Check Slack service status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check database configuration first
    let dbWebhookConfigured = false;
    let dbBotTokenConfigured = false;
    
    try {
      const supabase = createServiceRoleClient();
      const { data: config } = await supabase
        .from('slack_config')
        .select('webhook_url, bot_token')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (config) {
        dbWebhookConfigured = !!config.webhook_url;
        dbBotTokenConfigured = !!config.bot_token;
      }
    } catch (error) {
      console.error('Error reading Slack config from database:', error);
    }

    // Check environment variables as fallback
    const envWebhookConfigured = !!process.env.SLACK_WEBHOOK_URL;
    const envBotTokenConfigured = !!process.env.SLACK_BOT_TOKEN;
    
    // Use database config if available, otherwise fall back to environment
    const webhookConfigured = dbWebhookConfigured || envWebhookConfigured;
    const botTokenConfigured = dbBotTokenConfigured || envBotTokenConfigured;
    
    // Check if we can send messages
    let canSendMessages = false;
    try {
      const slackService = await getSlackService();
      canSendMessages = !!slackService;
    } catch (error) {
      console.error('Error checking message sending capability:', error);
    }
    
    // Check if we can lookup users
    let canLookupUsers = false;
    try {
      if (botTokenConfigured) {
        canLookupUsers = await SlackMentionService.validateSlackToken();
      }
    } catch (error) {
      console.error('Error checking user lookup capability:', error);
    }

    const status = {
      webhookConfigured,
      botTokenConfigured,
      canSendMessages,
      canLookupUsers,
      configSource: dbWebhookConfigured ? 'database' : 'environment',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking Slack status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
