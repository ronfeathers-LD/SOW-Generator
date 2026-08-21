import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserLookupService } from '@/lib/slack-user-lookup';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getSlackBotToken } from '@/lib/slack-bot-token';
import { isMaskedSecret } from '@/lib/utils/secret-mask';

// Scopes DMs need (see src/lib/slack-dm.ts) — surfaced here so an admin can
// confirm the bot token is DM-capable before relying on it in production.
const REQUIRED_DM_SCOPES = ['chat:write', 'im:write'];

async function resolveBotToken(providedToken?: string): Promise<{
  token: string | null;
  workspaceDomain?: string | null;
}> {
  // The admin form holds the masked placeholder (the config GET never returns
  // the real token) — treat a mask as "not provided" and use the stored token.
  if (providedToken && !isMaskedSecret(providedToken)) {
    return { token: providedToken };
  }

  const token = await getSlackBotToken();
  if (!token) {
    return { token: null };
  }

  // getSlackBotToken() only resolves the token; look up workspace_domain
  // separately so the env-seeding below keeps working as before.
  let workspaceDomain: string | null | undefined = process.env.SLACK_WORKSPACE_DOMAIN;
  if (!workspaceDomain) {
    try {
      const supabase = createServiceRoleClient();
      const { data: slackConfig } = await supabase
        .from('slack_config')
        .select('workspace_domain')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      workspaceDomain = slackConfig?.workspace_domain;
    } catch (error) {
      console.error('Unexpected error retrieving Slack workspace domain:', error);
    }
  }

  return { token, workspaceDomain };
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

    // Surface granted scopes so an admin can confirm DMs (chat:write,
    // im:write) will actually send before relying on them.
    let scopes: string[] | null = null;
    try {
      scopes = await SlackUserLookupService.getTokenScopes();
    } catch (error) {
      console.warn('Failed to fetch Slack token scopes:', error);
    }
    const missingScopes = scopes
      ? REQUIRED_DM_SCOPES.filter(scope => !scopes!.includes(scope))
      : [];

    if (!process.env.SLACK_BOT_TOKEN) {
      process.env.SLACK_BOT_TOKEN = token;
    }
    if (!process.env.SLACK_WORKSPACE_DOMAIN && workspaceDomain) {
      process.env.SLACK_WORKSPACE_DOMAIN = workspaceDomain;
    }

    let message = 'Bot token is valid. @mentions should work as expected.';
    if (missingScopes.length > 0) {
      message += ` Warning: missing scope(s) ${missingScopes.join(', ')} — direct-message notifications (e.g. full-approval DMs) will fail until these are granted.`;
    } else if (!scopes) {
      message += ' Could not verify granted scopes (no x-oauth-scopes header returned).';
    }

    return NextResponse.json({
      success: true,
      message,
      workspace: workspaceInfo ?? undefined,
      scopes: scopes ?? undefined,
      missingScopes: missingScopes.length > 0 ? missingScopes : undefined
    });
  } catch (error) {
    console.error('Error validating Slack bot token:', error);
    return NextResponse.json(
      { error: 'Internal server error while validating Slack bot token' },
      { status: 500 }
    );
  }
}

