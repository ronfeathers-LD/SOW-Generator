import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const sendTemplateEmail = vi.fn();
vi.mock('./email', () => ({
  getEmailService: async () => ({ sendTemplateEmail }),
}));
vi.mock('./slack', () => ({ getSlackService: async () => null }));
vi.mock('./slack-dm', () => ({
  sendSlackDirectMessage: vi.fn(),
  resolveSlackUserIdForAppUser: vi.fn(),
}));

// Records every write (table + op) in order. Reads resolve from `rows`.
const ops: string[] = [];
const rows: Record<string, Record<string, unknown>> = {};
let sowUpdateError: { message: string } | null = null;

function makeClient(): SupabaseClient {
  return {
    from(table: string) {
      let op = 'select';
      const builder: Record<string, unknown> = {
        select: () => builder,
        update: () => { op = 'update'; return builder; },
        delete: () => { op = 'delete'; return builder; },
        insert: () => { op = 'insert'; return builder; },
        eq: () => builder,
        neq: () => builder,
        single: async () => ({ data: rows[table] ?? null, error: null }),
        then: (resolve: (v: { data: null; error: { message: string } | null }) => void) => {
          if (op !== 'select') ops.push(`${table}.${op}`);
          resolve({ data: null, error: table === 'sows' && op === 'update' ? sowUpdateError : null });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

vi.mock('./supabase-server', () => ({
  createServerSupabaseClient: async () => makeClient(),
}));

import { ApprovalWorkflowService } from './approval-workflow-service';

beforeEach(() => {
  ops.length = 0;
  sendTemplateEmail.mockReset();
  sendTemplateEmail.mockResolvedValue(true);
  sowUpdateError = null;
  rows['sow_approvals'] = {
    id: 'appr-1',
    status: 'pending',
    stage: { name: 'Professional Services' },
  };
  rows['sows'] = {
    status: 'in_review',
    sow_title: 'Acme <b>SOW</b>',
    client_name: 'Acme & Sons',
    author_id: 'author-1',
    salesforce_account_owner_email: null,
  };
  rows['users'] = { name: 'Eve <script>x</script>', email: 'author@leandata.com' };
});

describe('missing user role is denied (audit #132)', () => {
  it('approveStage rejects an undefined role', async () => {
    const result = await ApprovalWorkflowService.approveStage(
      'sow-1', 'appr-1', 'u-1', undefined, undefined as unknown as string, makeClient()
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission/i);
    expect(ops).not.toContain('sow_approvals.update');
  });

  it('rejectStage rejects an undefined role', async () => {
    const result = await ApprovalWorkflowService.rejectStage(
      'sow-1', 'appr-1', 'u-1', 'no', undefined as unknown as string, makeClient()
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission/i);
    expect(ops).not.toContain('sow_approvals.update');
  });
});

describe('rejectStage ordering (audit #117)', () => {
  it('deletes sibling approval rows only after the SOW is marked rejected', async () => {
    const result = await ApprovalWorkflowService.rejectStage(
      'sow-1', 'appr-1', 'u-1', 'needs work', 'admin', makeClient()
    );
    expect(result.success).toBe(true);
    expect(ops.indexOf('sows.update')).toBeGreaterThanOrEqual(0);
    expect(ops.indexOf('sow_approvals.delete')).toBeGreaterThan(ops.indexOf('sows.update'));
  });

  it('does not delete sibling approval rows when marking the SOW rejected fails', async () => {
    sowUpdateError = { message: 'boom' };
    const result = await ApprovalWorkflowService.rejectStage(
      'sow-1', 'appr-1', 'u-1', 'needs work', 'admin', makeClient()
    );
    expect(result.success).toBe(false);
    expect(ops).not.toContain('sow_approvals.delete');
  });
});

describe('rejection email escapes user-controlled text (audit #119, #124)', () => {
  it('HTML-escapes title, client, approver, and comments', async () => {
    await ApprovalWorkflowService.rejectStage(
      'sow-1', 'appr-1', 'u-1', '<img src=x onerror=alert(1)>', 'admin', makeClient()
    );
    expect(sendTemplateEmail).toHaveBeenCalledTimes(1);
    const html: string = sendTemplateEmail.mock.calls[0][0].htmlContent;
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<b>SOW</b>');
    expect(html).toContain('Acme &lt;b&gt;SOW&lt;/b&gt;');
    expect(html).toContain('Acme &amp; Sons');
    expect(html).not.toContain('<script>');
  });
});
