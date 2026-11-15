import { describe, it, expect, beforeEach, vi } from 'vitest';

let updated: Record<string, unknown> | null = null;

vi.mock('next-auth', () => ({
  getServerSession: async () => ({
    user: { id: 'oauth-sub', email: 'Admin@leandata.com', role: 'admin' },
  }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: async () => ({
    from: () => {
      const builder = {
        select: () => builder,
        update: (payload: Record<string, unknown>) => { updated = payload; return builder; },
        eq: (_col: string, id: string) => {
          (builder as { id?: string }).id = id;
          return builder;
        },
        single: async () => {
          const id = (builder as { id?: string }).id;
          return { data: { email: id === 'self' ? 'admin@leandata.com' : 'other@leandata.com', role: 'x' }, error: null };
        },
      };
      return builder;
    },
  }),
}));

import { PATCH } from './route';

function patch(id: string, role: string) {
  return PATCH(
    new Request(`http://localhost/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }) as never,
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => { updated = null; });

describe('admin users PATCH role (audit #110)', () => {
  it('accepts the pmo role', async () => {
    const res = await patch('other', 'pmo');
    expect(res.status).toBe(200);
    expect(updated).toEqual({ role: 'pmo' });
  });

  it('rejects an unknown role', async () => {
    const res = await patch('other', 'root');
    expect(res.status).toBe(400);
  });

  it('refuses to let an admin demote themselves', async () => {
    const res = await patch('self', 'user');
    expect(res.status).toBe(400);
    expect(updated).toBeNull();
  });

  it('lets an admin re-save their own admin role', async () => {
    const res = await patch('self', 'admin');
    expect(res.status).toBe(200);
  });
});
