import { describe, it, expect, beforeEach, vi } from 'vitest';

const approveStage = vi.fn();
const rejectStage = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: async () => ({ user: { email: 'a@leandata.com' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: 'u-1', role: 'admin' }, error: null }) }),
      }),
    }),
  }),
}));
vi.mock('@/lib/approval-workflow-service', () => ({
  ApprovalWorkflowService: {
    approveStage: (...args: unknown[]) => approveStage(...args),
    rejectStage: (...args: unknown[]) => rejectStage(...args),
    getWorkflowStatus: async () => ({}),
  },
}));

import { PUT } from './route';

function put(body: unknown) {
  return PUT(
    new Request('http://localhost/api/sow/s/approvals/a', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 's', approvalId: 'a' }) }
  );
}

beforeEach(() => {
  approveStage.mockReset();
  rejectStage.mockReset();
});

describe('approval PUT error statuses (audit #112)', () => {
  it.each([
    ['You do not have permission to approve this stage', 403],
    ['Approval record not found', 404],
    ['SOW is not in review; its approval stages cannot be approved', 409],
    ['Stage is already approved', 409],
    ['Stage is no longer pending approval', 409],
    ['Failed to approve stage', 500],
  ])('maps "%s" to %i', async (error, status) => {
    approveStage.mockResolvedValue({ success: false, error });
    const res = await put({ action: 'approve' });
    expect(res.status).toBe(status);
  });

  it('maps a service-level "required" error to 400', async () => {
    rejectStage.mockResolvedValue({ success: false, error: 'Comments are required for rejection' });
    const res = await put({ action: 'reject', comments: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('approval PUT comment length cap (audit #124)', () => {
  it('rejects comments over 5000 characters with 400 before calling the service', async () => {
    const res = await put({ action: 'reject', comments: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
    expect(rejectStage).not.toHaveBeenCalled();
  });

  it('accepts comments at the limit', async () => {
    rejectStage.mockResolvedValue({ success: true });
    const res = await put({ action: 'reject', comments: 'x'.repeat(5000) });
    expect(res.status).toBe(200);
  });
});
