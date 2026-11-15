import { describe, it, expect, vi, afterEach } from 'vitest';
import { AvomaClient } from './avoma';

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AvomaClient.searchCalls pagination URL', () => {
  it('follows a same-origin next URL relative to the base path', async () => {
    const fetchMock = stubFetch();
    const client = new AvomaClient('k', 'https://api.avoma.com/v1');
    await client.searchCalls('q', undefined, 10, 'https://api.avoma.com/v1/meetings?page=2&limit=10');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.avoma.com/v1/meetings?page=2&limit=10');
  });

  it('rejects a next URL on a different origin without calling fetch', async () => {
    const fetchMock = stubFetch();
    const client = new AvomaClient('k', 'https://api.avoma.com/v1');
    await expect(
      client.searchCalls('q', undefined, 10, 'https://evil.example.com/v1/meetings?page=2')
    ).rejects.toThrow(/does not match/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an abort signal with requests', async () => {
    const fetchMock = stubFetch();
    const client = new AvomaClient('k', 'https://api.avoma.com/v1');
    await client.getCall('abc');
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
