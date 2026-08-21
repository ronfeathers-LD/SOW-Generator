/**
 * Single source of truth for resolving the Slack bot token.
 *
 * This consolidates a pattern that used to be copy-pasted across the app:
 * env var first, else the newest `slack_config` row. See callers in
 * slack-mention-service.ts, auth.ts, and the admin Slack API routes.
 */

import { createServiceRoleClient } from './supabase-server';

export async function getSlackBotToken(): Promise<string | null> {
  const envToken = process.env.SLACK_BOT_TOKEN;
  if (envToken) {
    return envToken;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: slackConfig, error } = await supabase
      .from('slack_config')
      .select('bot_token')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error reading Slack bot token from database:', error);
    }

    const botToken: string | null = slackConfig?.bot_token || null;

    // Memoize for the rest of this process, but only if nothing else has
    // set it in the meantime, matching the behavior of the call sites this
    // replaces.
    if (botToken && !process.env.SLACK_BOT_TOKEN) {
      process.env.SLACK_BOT_TOKEN = botToken;
    }

    return botToken;
  } catch (error) {
    console.error('Error resolving Slack bot token:', error);
    return null;
  }
}
