import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// getSlackBotToken() falls back to ./supabase-server when SLACK_BOT_TOKEN is
// unset. Mock it so the "missing token" test doesn't attempt a real network
// call, and so the env-first tests never touch it.
let configRow: Record<string, unknown> | null = null;
vi.mock('./supabase-server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            single: async () => ({ data: configRow, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    }),
  }),
}));

import { sendSlackDirectMessage } from './slack-dm';

const ORIGINAL_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const ORIGINAL_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const ORIGINAL_RAILWAY_ENV = process.env.RAILWAY_ENVIRONMENT_NAME;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('sendSlackDirectMessage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    configRow = null;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnv('SLACK_BOT_TOKEN', ORIGINAL_BOT_TOKEN);
    restoreEnv('NEXT_PUBLIC_APP_ENV', ORIGINAL_APP_ENV);
    restoreEnv('RAILWAY_ENVIRONMENT_NAME', ORIGINAL_RAILWAY_ENV);
  });

  it('posts to chat.postMessage with the user ID as channel and the bearer token', async () => {
    const result = await sendSlackDirectMessage('U123456', 'Your SOW is fully approved');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(init.headers.Authorization).toBe('Bearer xoxb-test-token');
    expect(init.headers['Content-Type']).toBe('application/json; charset=utf-8');

    const body = JSON.parse(init.body as string);
    expect(body.channel).toBe('U123456');
    expect(body.text).toBe('Your SOW is fully approved');
  });

  it('applies the staging prefix when NEXT_PUBLIC_APP_ENV=staging', async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';

    await sendSlackDirectMessage('U123456', 'Your SOW is fully approved');

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe(':construction: *[STAGE]* Your SOW is fully approved');
  });

  it('does not apply the staging prefix when not staging', async () => {
    await sendSlackDirectMessage('U123456', 'Your SOW is fully approved');

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe('Your SOW is fully approved');
  });

  it('returns { ok: false } (no throw) when Slack responds with missing_scope', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'missing_scope' }),
      text: async () => '',
    });

    const result = await sendSlackDirectMessage('U123456', 'Your SOW is fully approved');

    expect(result).toEqual({ ok: false, error: 'missing_scope' });
  });

  it('returns { ok: false } (no throw) when the bot token is missing', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    configRow = null; // DB fallback also has no row (PGRST116)

    const result = await sendSlackDirectMessage('U123456', 'Your SOW is fully approved');

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
