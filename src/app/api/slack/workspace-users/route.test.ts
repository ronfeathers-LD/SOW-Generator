import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => null) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { GET } from './route';

describe('workspace-users auth ordering (#247)', () => {
  it('returns 401 for unauthenticated callers without consuming rate-limit budget', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await GET(new Request('http://x/api/slack/workspace-users', { headers: { 'x-forwarded-for': '1.2.3.4' } }));
      statuses.push(res.status);
    }
    expect(statuses.every((s) => s === 401)).toBe(true);
  });
});
