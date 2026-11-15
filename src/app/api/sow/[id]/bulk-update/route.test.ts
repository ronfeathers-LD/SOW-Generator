import { describe, it, expect, beforeEach, vi } from 'vitest';

const reconcilePMStage = vi.fn();
let sowStatus = 'in_review';

vi.mock('next-auth', () => ({
  getServerSession: async () => ({ user: { email: 'a@leandata.com' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/changelog-service', () => ({
  ChangelogService: { compareSOWs: async () => undefined },
}));
vi.mock('@/lib/sow/tab-column-mapping', () => ({
  buildTabColumnUpdate: () => ({ pricing_roles: { roles: [] } }),
  applyTabSideEffects: async () => undefined,
  InvalidTabError: class InvalidTabError extends Error {},
}));
vi.mock('@/lib/approval-workflow-service', () => ({
  ApprovalWorkflowService: {
    reconcilePMStage: (...args: unknown[]) => reconcilePMStage(...args),
  },
}));
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === 'users'
              ? { data: { id: 'u-1', role: 'admin' }, error: null }
              : { data: { id: 's', author_id: 'u-1', status: sowStatus }, error: null },
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: 's', status: sowStatus }, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

import { PUT } from './route';

function put(tabs: Array<{ tab: string; data: Record<string, unknown> }>) {
  return PUT(
    new Request('http://localhost/api/sow/s/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ tabs }),
    }),
    { params: Promise.resolve({ id: 's' }) }
  );
}

beforeEach(() => {
  reconcilePMStage.mockReset();
  reconcilePMStage.mockResolvedValue({ success: true, added_pm_stage: false });
  sowStatus = 'in_review';
});

describe('bulk-update PM stage reconcile (#118)', () => {
  it('reconciles after a Pricing save on an in-review SOW', async () => {
    const res = await put([{ tab: 'Pricing', data: {} }]);
    expect(res.status).toBe(200);
    expect(reconcilePMStage).toHaveBeenCalledTimes(1);
    expect(reconcilePMStage.mock.calls[0][0]).toBe('s');
  });

  it('does not reconcile for a draft SOW', async () => {
    sowStatus = 'draft';
    await put([{ tab: 'Pricing', data: {} }]);
    expect(reconcilePMStage).not.toHaveBeenCalled();
  });

  it('does not reconcile when the save did not include Pricing', async () => {
    sowStatus = 'draft';
    await put([{ tab: 'Billing', data: {} }]);
    expect(reconcilePMStage).not.toHaveBeenCalled();
  });

  it('still succeeds when reconcile fails or throws', async () => {
    reconcilePMStage.mockResolvedValueOnce({ success: false, added_pm_stage: false, error: 'x' });
    expect((await put([{ tab: 'Pricing', data: {} }])).status).toBe(200);
    reconcilePMStage.mockRejectedValueOnce(new Error('boom'));
    expect((await put([{ tab: 'Pricing', data: {} }])).status).toBe(200);
  });
});
