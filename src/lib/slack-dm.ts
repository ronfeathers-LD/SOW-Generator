/**
 * Direct-message a Slack user via chat.postMessage. Distinct from slack.ts,
 * which only ever posts to the configured webhook/channel — a DM needs the
 * bot token (chat:write, im:write scopes) and a Slack user ID, not a webhook.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSlackBotToken } from './slack-bot-token';
import { markSlackTextForStage } from './slack';
import { isStagingDeploy } from './deploy-env';
import { SlackUserLookupService } from './slack-user-lookup';

const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Send a direct message to a Slack user. Slack opens the IM automatically
 * when `channel` is a user ID (no separate conversations.open call needed).
 * Never throws — callers that treat notifications as fire-and-forget can
 * just check `ok`.
 */
export async function sendSlackDirectMessage(
  slackUserId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getSlackBotToken();
    if (!token) {
      console.warn('Slack bot token not configured - cannot send direct message');
      return { ok: false, error: 'missing_bot_token' };
    }

    const messageText = isStagingDeploy() ? markSlackTextForStage(text) : text;

    const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel: slackUserId, text: messageText }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Slack chat.postMessage failed: ${response.status} ${response.statusText} ${body}`.trim());
      return { ok: false, error: `http_${response.status}` };
    }

    const data = await response.json().catch(() => null);
    if (!data || data.ok !== true) {
      const error = data?.error || 'unknown_error';

      if (error === 'missing_scope' || error === 'not_allowed_token_type') {
        console.error(
          `Slack direct message failed (${error}): the bot token needs the "chat:write" and ` +
          `"im:write" scopes to message users directly. Check Admin → Slack → Test Bot Token.`
        );
      } else if (error === 'channel_not_found') {
        console.error(
          `Slack direct message failed (channel_not_found) for user ${slackUserId}: could not open ` +
          `a DM. Confirm the bot token has the "im:write" scope and the Slack user ID is valid.`
        );
      } else {
        console.error(`Slack direct message failed: ${error}`);
      }

      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error sending Slack direct message:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_error' };
  }
}

/**
 * Resolve the Slack user ID for an app user: honor an existing manual
 * mapping (users.slack_user_id) first, otherwise look the user up by email
 * and self-heal the mapping so future calls skip the API round trip. Never
 * throws — returns null on any failure.
 */
export async function resolveSlackUserIdForAppUser(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('slack_user_id, email')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    if (user.slack_user_id) {
      return user.slack_user_id as string;
    }

    if (!user.email) {
      return null;
    }

    const token = await getSlackBotToken();
    if (!token) {
      return null;
    }

    SlackUserLookupService.initialize(token);
    const lookup = await SlackUserLookupService.lookupUserByEmail(user.email);
    if (!lookup.success || !lookup.user) {
      return null;
    }

    const slackUserId = lookup.user.id;
    const slackUsername = lookup.user.name;

    // Best-effort self-heal so the next lookup skips the Slack API call.
    try {
      await supabase
        .from('users')
        .update({
          slack_user_id: slackUserId,
          slack_username: slackUsername,
          slack_mapping_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (writeError) {
      console.warn('Failed to self-heal Slack user mapping:', writeError);
    }

    return slackUserId;
  } catch (error) {
    console.error('Error resolving Slack user ID for app user:', error);
    return null;
  }
}
