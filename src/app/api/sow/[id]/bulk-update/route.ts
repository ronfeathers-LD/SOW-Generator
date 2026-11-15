import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangelogService } from '@/lib/changelog-service';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';
import {
  buildTabColumnUpdate,
  applyTabSideEffects,
  InvalidTabError,
} from '@/lib/sow/tab-column-mapping';

/**
 * Bulk tab save: persist every wizard tab in a single request.
 *
 * This is the only tab-save endpoint (it replaced a per-tab PUT that cost up
 * to 7 sequential round-trips). It authorizes once, fetches the row once,
 * merges every tab's column update, runs side effects, does one UPDATE, and
 * logs one changelog entry covering the whole save.
 *
 * The field→column mapping lives in `@/lib/sow/tab-column-mapping`.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const { tabs } = (await request.json()) as {
      tabs?: Array<{ tab: string; data: Record<string, unknown> }>;
    };
    const sowId = (await params).id;

    if (!Array.isArray(tabs) || tabs.length === 0) {
      return NextResponse.json({ error: 'No tabs provided' }, { status: 400 });
    }

    // --- AuthN/AuthZ ---
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Object-level authorization: only the author or an elevated role may edit.
    const elevatedRoles = ['admin', 'manager', 'pmo'];
    const isOwner = existingSOW.author_id === user.id;
    if (!isOwner && !elevatedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this SOW' },
        { status: 403 }
      );
    }

    // In-review SOWs are locked except for admins editing pricing/discounts —
    // applied per tab, one tab at a time.
    const isAdmin = user.role === 'admin';
    const isInReview = existingSOW.status === 'in_review';
    if (isInReview) {
      const forbidden = tabs
        .map((t) => t.tab)
        .filter((tab) => !(isAdmin && tab === 'Pricing'));
      if (forbidden.length > 0) {
        return NextResponse.json(
          {
            error:
              'SOW is currently under review. Only admins can edit pricing and discounts during approval.',
          },
          { status: 403 }
        );
      }
    }

    // --- Build the merged column update + run side effects ---
    // Tabs are applied in the order received (the form sends them in section
    // order); later tabs override earlier ones on any shared column, matching
    // the previous sequential save semantics. Only the Billing tab reads
    // existingSOW (its billing_info JSONB merge), and no other tab writes that
    // column, so reading the row once is safe.
    const updateData: Record<string, unknown> = {};
    try {
      for (const { tab, data } of tabs) {
        // Side effects (e.g. Objectives → avoma_recordings) run before the
        // main row update.
        await applyTabSideEffects(supabase, sowId, tab, data ?? {});
        Object.assign(updateData, buildTabColumnUpdate(tab, data ?? {}, existingSOW));
      }
    } catch (err) {
      if (err instanceof InvalidTabError) {
        return NextResponse.json({ error: 'Invalid tab specified' }, { status: 400 });
      }
      throw err;
    }

    // Nothing mapped to a column (e.g. only side effects) — done.
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No column changes to save',
        sowId,
      });
    }

    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', sowId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Supabase bulk update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedSOW) {
      return NextResponse.json(
        { error: 'SOW update returned no data' },
        { status: 500 }
      );
    }

    // One changelog entry for the whole save (vs. one per tab before).
    try {
      await ChangelogService.compareSOWs(
        sowId,
        existingSOW,
        updatedSOW,
        user.id,
        { source: 'bulk_update', tabs: tabs.map((t) => t.tab), update_type: 'save_all' }
      );
    } catch (changelogError) {
      console.error('❌ Error logging changes to changelog:', changelogError);
      // Don't fail the save if changelog logging fails.
    }

    // Pricing edits on an in-review SOW can add PM hours after the workflow
    // was built without a PM stage; re-enforce the required stage (#118).
    if (isInReview && tabs.some((t) => t.tab === 'Pricing')) {
      try {
        const reconcile = await ApprovalWorkflowService.reconcilePMStage(sowId, supabase);
        if (!reconcile.success) {
          console.error('Failed to reconcile PM approval stage after pricing save:', reconcile.error);
        }
      } catch (reconcileError) {
        console.error('Error reconciling PM approval stage after pricing save:', reconcileError);
        // Don't fail the save if reconciliation fails.
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All changes saved',
      sowId,
    });
  } catch (error) {
    console.error('Error in bulk SOW update:', error);
    return NextResponse.json(
      { error: 'Failed to save changes' },
      { status: 500 }
    );
  }
}
