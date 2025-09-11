/**
 * Tests for app URL utility
 */

import { getAppBaseUrl, getSOWUrl, getPMHoursRemovalUrl } from '../app-url';

describe('App URL Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getAppBaseUrl', () => {
    it('should return NEXT_PUBLIC_APP_URL when set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      const baseUrl = getAppBaseUrl();
      expect(baseUrl).toBe('https://myapp.com');
    });

    it('should return NEXTAUTH_URL when NEXT_PUBLIC_APP_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXTAUTH_URL = 'https://auth.myapp.com';
      const baseUrl = getAppBaseUrl();
      expect(baseUrl).toBe('https://auth.myapp.com');
    });

    it('should return VERCEL_URL when other URLs are not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;
      process.env.VERCEL_URL = 'myapp.vercel.app';
      const baseUrl = getAppBaseUrl();
      expect(baseUrl).toBe('https://myapp.vercel.app');
    });

    it('should return localhost fallback when no environment URLs are set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;
      delete process.env.VERCEL_URL;
      const baseUrl = getAppBaseUrl();
      expect(baseUrl).toBe('http://localhost:3000');
    });
  });

  describe('getSOWUrl', () => {
    it('should construct correct SOW URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      const sowUrl = getSOWUrl('test-sow-id');
      expect(sowUrl).toBe('https://myapp.com/sow/test-sow-id');
    });
  });

  describe('getPMHoursRemovalUrl', () => {
    it('should construct correct PM hours removal URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      const pmUrl = getPMHoursRemovalUrl('test-request-id');
      expect(pmUrl).toBe('https://myapp.com/pmo/pm-hours-removal?id=test-request-id');
    });
  });
});
