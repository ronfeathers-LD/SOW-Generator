import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PMHoursRemovalService } from '@/lib/pm-hours-removal-service';
import { authOptions } from '@/lib/auth';
import { loadSegmentRules } from '@/lib/segment-rules-server';
import { isSelfServePmRemoval } from '@/lib/segment-rules';

// POST - Directly disable the PM hours requirement for an Enterprise SOW.
// Enterprise accounts skip the PMO approval flow, so there is no request to
// approve; this persists the suppression flag + stripped pricing authoritatively
// so the removal survives a reload (see PMHoursRemovalService.disablePMHoursRequirementDirect).
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { sowId } = await request.json();
    if (!sowId) {
      return NextResponse.json({ error: 'Missing required field: sowId' }, { status: 400 });
    }

    const { data: sow } = await supabase
      .from('sows')
      .select('status, author_id, account_segment')
      .eq('id', sowId)
      .single();

    if (!sow) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    if (sow.status !== 'draft') {
      return NextResponse.json({
        error: 'PM hours can only be removed for SOWs in draft status',
      }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    if (sow.author_id !== user.id && !isAdmin) {
      return NextResponse.json({
        error: 'You can only remove PM hours for SOWs you created',
      }, { status: 403 });
    }

    // Segment gate: only self-serve segments (seeded: EE/LE) may disable directly.
    // Everyone else must use the PMO approval flow. The client UI enforces this
    // too, but the server is the authority.
    const rules = await loadSegmentRules(supabase);
    if (!isSelfServePmRemoval(rules, sow.account_segment)) {
      return NextResponse.json(
        { error: 'This account segment requires PMO approval to remove PM hours' },
        { status: 403 }
      );
    }

    const result = await PMHoursRemovalService.disablePMHoursRequirementDirect(
      sowId,
      user.id,
      supabase
    );

    if (!result.success) {
      console.error('Failed to disable PM hours requirement (enterprise):', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, pmHoursRemoved: result.pmHoursRemoved });
  } catch (error) {
    console.error('Error disabling PM hours requirement (enterprise):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
