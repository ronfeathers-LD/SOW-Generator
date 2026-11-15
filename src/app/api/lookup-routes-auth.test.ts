import { describe, it, expect, vi } from 'vitest';

const supabaseTouched = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => null) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    supabaseTouched();
    throw new Error('should not be reached');
  }),
  createServiceRoleClient: vi.fn(() => {
    supabaseTouched();
    throw new Error('should not be reached');
  }),
}));

import { GET as getProducts } from './products/route';
import { GET as getSignatories } from './leandata-signatories/route';
import { GET as getPricingRoles } from './pricing-roles-config/route';

describe('read-only lookup routes require a session (#174)', () => {
  it.each([
    ['products', getProducts],
    ['leandata-signatories', getSignatories],
    ['pricing-roles-config', getPricingRoles],
  ])('%s returns 401 without a session and never queries the database', async (_name, handler) => {
    const res = await handler();
    expect(res.status).toBe(401);
    expect(supabaseTouched).not.toHaveBeenCalled();
  });
});
