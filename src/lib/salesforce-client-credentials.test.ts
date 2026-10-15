import { describe, it, expect, vi, afterEach } from 'vitest';
import { SalesforceClient } from './salesforce';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SalesforceClient.authenticateWithClientCredentials', () => {
  it('posts a client_credentials form to the My Domain token endpoint and sets the connection', async () => {
    const fetchMock = mockFetch(200, {
      access_token: 'tok-123',
      instance_url: 'https://leandata.my.salesforce.com',
    });
    const client = new SalesforceClient();

    await client.authenticateWithClientCredentials('key-1', 'sec-1', 'https://leandata.my.salesforce.com/');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://leandata.my.salesforce.com/services/oauth2/token');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const params = new URLSearchParams(init.body);
    expect(params.get('grant_type')).toBe('client_credentials');
    expect(params.get('client_id')).toBe('key-1');
    expect(params.get('client_secret')).toBe('sec-1');

    const conn = client.getConnection();
    expect(conn.instanceUrl).toBe('https://leandata.my.salesforce.com');
    expect(conn.accessToken).toBe('tok-123');
    expect(client.isAuthenticated()).toBe(true);
  });

  it("surfaces Salesforce's error and error_description without leaking the secret", async () => {
    mockFetch(400, { error: 'invalid_client', error_description: 'invalid client credentials' });
    const client = new SalesforceClient();

    const err = await client
      .authenticateWithClientCredentials('key-1', 'super-secret', 'https://leandata.my.salesforce.com')
      .catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('invalid_client');
    expect((err as Error).message).toContain('invalid client credentials');
    expect((err as Error).message).not.toContain('super-secret');
    expect(client.isAuthenticated()).toBe(false);
  });

  it.each(['https://login.salesforce.com', 'test.salesforce.com/', 'https://LOGIN.salesforce.com'])(
    'rejects generic host %s without calling fetch',
    async (loginUrl) => {
      const fetchMock = mockFetch(200, {});
      const client = new SalesforceClient();

      await expect(
        client.authenticateWithClientCredentials('key-1', 'sec-1', loginUrl)
      ).rejects.toThrow(/My Domain/);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
});
