import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SlackService, markSlackPayloadForStage } from './slack';
import type { SlackMessage } from './slack';

const ORIGINAL_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const ORIGINAL_RAILWAY_ENV = process.env.RAILWAY_ENVIRONMENT_NAME;

const STAGE_CONTEXT_TEXT =
  ':construction: *Sent from the STAGING environment — this is test traffic, not a real notification.*';

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('markSlackPayloadForStage (pure decoration)', () => {
  it('appends " · STAGE" to the username and swaps the icon', () => {
    const marked = markSlackPayloadForStage({
      text: 'hello',
      username: 'SOW Generator'
    });
    expect(marked.username).toBe('SOW Generator · STAGE');
    expect(marked.icon_emoji).toBe(':construction:');
  });

  it('falls back to the default username when none is set', () => {
    const marked = markSlackPayloadForStage({ text: 'hello' });
    expect(marked.username).toBe('SOW Generator · STAGE');
  });

  it('prefixes plain-text messages on the first line', () => {
    const marked = markSlackPayloadForStage({ text: 'line one\nline two' });
    expect(marked.text).toBe(':construction: *[STAGE]* line one\nline two');
  });

  it('prepends a staging context block to block payloads', () => {
    const original = [{ type: 'header', text: { type: 'plain_text', text: 'Hi' } }];
    const marked = markSlackPayloadForStage({ blocks: original });
    expect(marked.blocks).toHaveLength(2);
    expect(marked.blocks?.[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: STAGE_CONTEXT_TEXT }]
    });
    expect(marked.blocks?.[1]).toEqual(original[0]);
  });

  it('does not mutate the input payload', () => {
    const payload: SlackMessage = {
      text: 'hello',
      blocks: [{ type: 'divider' }],
      username: 'SOW Generator'
    };
    markSlackPayloadForStage(payload);
    expect(payload.text).toBe('hello');
    expect(payload.blocks).toHaveLength(1);
    expect(payload.username).toBe('SOW Generator');
    expect(payload.icon_emoji).toBeUndefined();
  });
});

describe('SlackService staging gate (no network — fetch is stubbed)', () => {
  const fetchMock = vi.fn();
  let service: SlackService;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    service = new SlackService({
      webhookUrl: 'https://hooks.slack.invalid/test',
      channel: '#ps_sow_approvals',
      username: 'SOW Generator',
      iconEmoji: ':memo:'
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnv('NEXT_PUBLIC_APP_ENV', ORIGINAL_APP_ENV);
    restoreEnv('RAILWAY_ENVIRONMENT_NAME', ORIGINAL_RAILWAY_ENV);
  });

  function lastSentBody(): SlackMessage {
    const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    return JSON.parse(init.body as string);
  }

  it('marks sendMessage payloads when staging', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    await service.sendMessage('SOW submitted');
    const body = lastSentBody();
    expect(body.text).toBe(':construction: *[STAGE]* SOW submitted');
    expect(body.username).toBe('SOW Generator · STAGE');
    expect(body.icon_emoji).toBe(':construction:');
  });

  it('marks sendMessageWithMentions payloads when staging', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    await service.sendMessageWithMentions('please review', ['U123']);
    const body = lastSentBody();
    expect(body.text).toBe(':construction: *[STAGE]* <@U123> please review');
    expect(body.username).toBe('SOW Generator · STAGE');
  });

  it('prepends the staging context block on sendRichMessage when staging', async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    await service.sendRichMessage([{ type: 'divider' }]);
    const body = lastSentBody();
    expect(body.blocks?.[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: STAGE_CONTEXT_TEXT }]
    });
    expect(body.blocks?.[1]).toEqual({ type: 'divider' });
    expect(body.icon_emoji).toBe(':construction:');
  });

  it('marks block-builder notifications (sendApprovalNotification) when staging', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    await service.sendApprovalNotification(
      'sow-1', 'Title', 'Client', 'Stage 1', 'Approver', 'approved'
    );
    const body = lastSentBody();
    expect(body.blocks?.[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: STAGE_CONTEXT_TEXT }]
    });
    expect(body.username).toBe('SOW Generator · STAGE');
  });

  it('does not modify payloads when not staging (no-op)', async () => {
    await service.sendMessage('SOW submitted');
    const textBody = lastSentBody();
    expect(textBody.text).toBe('SOW submitted');
    expect(textBody.username).toBe('SOW Generator');
    expect(textBody.icon_emoji).toBe(':memo:');

    await service.sendRichMessage([{ type: 'divider' }]);
    const blockBody = lastSentBody();
    expect(blockBody.blocks).toEqual([{ type: 'divider' }]);
  });

  it('does not modify payloads in production', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
    await service.sendStatusChangeNotification(
      'sow-1', 'Title', 'Client', 'draft', 'in_review', 'Ron'
    );
    const body = lastSentBody();
    expect(JSON.stringify(body)).not.toContain('STAGING');
    expect(body.username).toBe('SOW Generator');
  });
});
