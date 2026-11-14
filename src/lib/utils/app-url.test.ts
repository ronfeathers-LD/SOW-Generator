import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAppBaseUrl,
  getDriveOAuthRedirectUri,
  getPMHoursRemovalUrl,
  getSOWUrl,
} from './app-url';

describe('App URL Utility', () => {
  beforeEach(() => {
    // Start every test with no URL env vars set, regardless of the host env.
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    vi.stubEnv('NEXTAUTH_URL', undefined);
    vi.stubEnv('RAILWAY_PUBLIC_DOMAIN', undefined);
    vi.stubEnv('VERCEL_URL', undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  describe('getAppBaseUrl', () => {
    it('returns NEXT_PUBLIC_APP_URL when set', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://myapp.com');
      expect(getAppBaseUrl()).toBe('https://myapp.com');
    });

    it('returns NEXTAUTH_URL when NEXT_PUBLIC_APP_URL is not set', () => {
      vi.stubEnv('NEXTAUTH_URL', 'https://auth.myapp.com');
      expect(getAppBaseUrl()).toBe('https://auth.myapp.com');
    });

    it('returns RAILWAY_PUBLIC_DOMAIN when the explicit URLs are not set', () => {
      vi.stubEnv('RAILWAY_PUBLIC_DOMAIN', 'myapp.up.railway.app');
      expect(getAppBaseUrl()).toBe('https://myapp.up.railway.app');
    });

    it('returns VERCEL_URL when other URLs are not set', () => {
      vi.stubEnv('VERCEL_URL', 'myapp.vercel.app');
      expect(getAppBaseUrl()).toBe('https://myapp.vercel.app');
    });

    it('returns localhost fallback when no environment URLs are set', () => {
      expect(getAppBaseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('getSOWUrl', () => {
    it('constructs the SOW URL', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://myapp.com');
      expect(getSOWUrl('test-sow-id')).toBe('https://myapp.com/sow/test-sow-id');
    });
  });

  describe('getPMHoursRemovalUrl', () => {
    it('constructs the PM hours removal URL', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://myapp.com');
      expect(getPMHoursRemovalUrl('test-request-id')).toBe(
        'https://myapp.com/pmo/pm-hours-removal?id=test-request-id',
      );
    });
  });

  describe('getDriveOAuthRedirectUri', () => {
    it('uses the app base URL, not a hardcoded localhost', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sow.example.com');
      expect(getDriveOAuthRedirectUri()).toBe('https://sow.example.com/oauth/callback');
    });

    it('tolerates a trailing slash on the base URL', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sow.example.com/');
      expect(getDriveOAuthRedirectUri()).toBe('https://sow.example.com/oauth/callback');
    });
  });
});
