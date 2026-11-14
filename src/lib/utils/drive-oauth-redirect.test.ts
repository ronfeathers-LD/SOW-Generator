import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDriveOAuthRedirectUri } from './app-url';

describe('getDriveOAuthRedirectUri', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the app base URL, not a hardcoded localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sow.example.com');
    expect(getDriveOAuthRedirectUri()).toBe('https://sow.example.com/oauth/callback');
  });

  it('tolerates a trailing slash on the base URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sow.example.com/');
    expect(getDriveOAuthRedirectUri()).toBe('https://sow.example.com/oauth/callback');
  });
});
