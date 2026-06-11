import { describe, it, expect, afterEach, vi } from 'vitest';

// getSlackService lazily imports ./supabase-server; mock it so each test can
// shape the slack_config row the service builder sees.
let configRow: Record<string, unknown> | null = null;
vi.mock('./supabase-server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            single: async () => ({ data: configRow, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

import { getSlackService } from './slack';

const BASE_ROW = {
  id: 1,
  webhook_url: 'https://hooks.slack.com/services/T000/B000/XXX',
  channel: '#ps_sow_approvals',
  username: 'SOW Generator',
  icon_emoji: ':memo:',
  bot_token: '',
  workspace_domain: '',
};

describe('getSlackService honors slack_config.is_enabled (#368)', () => {
  afterEach(() => {
    configRow = null;
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it('returns null when the admin toggle is off', async () => {
    configRow = { ...BASE_ROW, is_enabled: false };
    expect(await getSlackService()).toBeNull();
  });

  it('returns a service when the toggle is on', async () => {
    configRow = { ...BASE_ROW, is_enabled: true };
    expect(await getSlackService()).not.toBeNull();
  });

  it('treats a NULL flag as enabled (matches admin API is_enabled ?? true)', async () => {
    configRow = { ...BASE_ROW, is_enabled: null };
    expect(await getSlackService()).not.toBeNull();
  });

  it('does not fall back to env webhook when the toggle is off', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T000/B000/ENV';
    configRow = { ...BASE_ROW, is_enabled: false };
    expect(await getSlackService()).toBeNull();
  });
});
