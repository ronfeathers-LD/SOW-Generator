import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserLookupService } from '@/lib/slack-user-lookup';
import { createServiceRoleClient } from '@/lib/supabase-server';

async function resolveBotToken(providedToken?: string): Promise<{
  token: string | null;
  workspaceDomain?: string | null;
}> {
  if (providedToken) {
    return { token: providedToken };
  }

  if (process.env.SLACK_BOT_TOKEN) {
    return {
      token: process.env.SLACK_BOT_TOKEN,
      workspaceDomain: process.env.SLACK_WORKSPACE_DOMAIN
    };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: slackConfig, error } = await supabase
      .from('slack_config')
      .select('bot_token, workspace_domain')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error retrieving Slack config for bot token test:', error);
      return { token: null };
    }

    if (slackConfig?.bot_token) {
      return {
        token: slackConfig.bot_token,
        workspaceDomain: slackConfig.workspace_domain
      };
    }
  } catch (error) {
    console.error('Unexpected error retrieving Slack bot token:', error);
    return { token: null };
  }

  return { token: null };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botToken: providedToken } = await request.json().catch(() => ({}));
    const { token, workspaceDomain } = await resolveBotToken(providedToken);

    if (!token) {
      return NextResponse.json(
        { error: 'Slack bot token not configured. Please add a bot token to test @mentions.' },
        { status: 400 }
      );
    }

    SlackUserLookupService.initialize(token);
    const isValid = await SlackUserLookupService.validateToken();

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'Bot token validation failed. Confirm that the token is active and has the required scopes.'
        },
        { status: 400 }
      );
    }

    // Attempt to fetch workspace info for richer feedback
    let workspaceInfo: { name: string; domain: string } | null = null;
    try {
      workspaceInfo = await SlackUserLookupService.getWorkspaceInfo();
    } catch (error) {
      console.warn('Failed to fetch Slack workspace info:', error);
    }

    if (!process.env.SLACK_BOT_TOKEN) {
      process.env.SLACK_BOT_TOKEN = token;
    }
    if (!process.env.SLACK_WORKSPACE_DOMAIN && workspaceDomain) {
      process.env.SLACK_WORKSPACE_DOMAIN = workspaceDomain;
    }

    return NextResponse.json({
      success: true,
      message: 'Bot token is valid. @mentions should work as expected.',
      workspace: workspaceInfo ?? undefined
    });
  } catch (error) {
    console.error('Error validating Slack bot token:', error);
    return NextResponse.json(
      { error: 'Internal server error while validating Slack bot token' },
      { status: 500 }
    );
  }
}

