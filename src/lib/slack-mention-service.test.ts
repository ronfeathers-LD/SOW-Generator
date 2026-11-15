import { describe, it, expect, vi } from 'vitest';

vi.mock('./email', () => ({ getEmailService: async () => null }));
vi.mock('./supabase-server', () => ({ createServerSupabaseClient: async () => ({}) }));
vi.mock('./slack-bot-token', () => ({ getSlackBotToken: async () => null }));

import { SlackMentionService } from './slack-mention-service';
import type { CommentMentionNotification } from './slack-mention-service';
import type { SlackService } from './slack';

type Sender = (n: CommentMentionNotification, s: SlackService) => Promise<boolean>;

describe('Slack mention message escaping (audit #176)', () => {
  it('escapes Slack control characters in user-supplied text', async () => {
    const sendMessageWithMentions = vi.fn().mockResolvedValue(true);
    const send = (SlackMentionService as unknown as { sendSlackMentionNotification: Sender })
      .sendSlackMentionNotification;

    await send.call(
      SlackMentionService,
      {
        sowId: 's1',
        sowTitle: 'Deal <!here>',
        clientName: 'A & B',
        commentText: 'ping <!channel> and <@U123> <https://evil.example|click>',
        commentAuthor: '<!everyone>',
        mentionedUsers: [{ username: 'x', slackUserId: 'U1' }],
        sowUrl: 'https://app.example/sow/s1',
        quotedText: '<!channel> quoted',
      } as CommentMentionNotification,
      { sendMessageWithMentions } as unknown as SlackService
    );

    const message: string = sendMessageWithMentions.mock.calls[0][0];
    expect(message).not.toContain('<!channel>');
    expect(message).not.toContain('<!here>');
    expect(message).not.toContain('<!everyone>');
    expect(message).not.toContain('<@U123>');
    expect(message).not.toContain('<https://evil');
    expect(message).toContain('&lt;!channel&gt;');
    expect(message).toContain('A &amp; B');
    // The app's own link must survive.
    expect(message).toContain('<https://app.example/sow/s1|View SOW>');
  });
});
