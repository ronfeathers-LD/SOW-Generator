import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { authOptions } from '@/lib/auth';
import { getSlackService } from '@/lib/slack';
import { getSOWUrl } from '@/lib/utils/app-url';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceRoleClient();

    // Fetch SOW
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (sowError || !sow) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    if (sow.status !== 'in_review') {
      return NextResponse.json(
        { error: 'Only SOWs in review can be recalled' },
        { status: 400 }
      );
    }

    // Lookup user to check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const isAuthor = sow.author_id && sow.author_id === userRecord.id;
    const isManagerOrAdmin =
      userRecord.role === 'manager' || userRecord.role === 'admin';

    if (!isAuthor && !isManagerOrAdmin) {
      return NextResponse.json(
        {
          error:
            'Permission denied. Only the SOW author or admin/manager can recall a submission.',
        },
        { status: 403 }
      );
    }

    // Ensure no approvals are already granted before recall
    const { data: approvals } = await supabase
      .from('sow_approvals')
      .select('status')
      .eq('sow_id', id);

    const hasApprovedStage = approvals?.some(
      (approval) => approval.status === 'approved'
    );

    if (hasApprovedStage) {
      return NextResponse.json(
        {
          error:
            'Recall unavailable. At least one approval stage is already approved. Please reject instead.',
        },
        { status: 400 }
      );
    }

    // Remove current approvals so the next submission starts fresh
    await supabase.from('sow_approvals').delete().eq('sow_id', id);

    const rootSowId = sow.parent_id || sow.id;

    // Mark entire family as not latest before creating new revision
    await supabase
      .from('sows')
      .update({ is_latest: false })
      .or(`id.eq.${rootSowId},parent_id.eq.${rootSowId}`);

    // Determine next version number
    const { data: latestVersion } = await supabase
      .from('sows')
      .select('version')
      .or(`id.eq.${rootSowId},parent_id.eq.${rootSowId}`)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version || 0) + 1;

    const revisionData = {
      ...sow,
      id: undefined,
      parent_id: rootSowId,
      version: nextVersion,
      is_latest: true,
      status: 'draft' as const,
      created_at: undefined,
      updated_at: undefined,
      author_id: userRecord.id,
      approved_at: null,
      rejected_at: null,
      approved_by: null,
      rejected_by: null,
      approval_comments: null,
      submitted_at: null,
      submitted_by: null,
      // Ensure signature fields reset where appropriate
      signature_date: null,
      // Preserve hidden flag and other business data as-is
    };

    const { data: newRevision, error: revisionError } = await supabase
      .from('sows')
      .insert(revisionData)
      .select()
      .single();

    if (revisionError || !newRevision) {
      console.error('Error creating recalled revision:', revisionError);
      return NextResponse.json(
        { error: 'Failed to create recalled revision' },
        { status: 500 }
      );
    }

    // Update the recalled SOW status
    const { error: updateError } = await supabase
      .from('sows')
      .update({
        status: 'recalled',
        is_latest: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sow.id);

    if (updateError) {
      console.error('Error marking SOW as recalled:', updateError);
    }

    // Notify Slack (best-effort)
    try {
      const slackService = await getSlackService();
      if (slackService && sow.client_name?.toLowerCase() !== 'hula truck') {
        const sowUrl = getSOWUrl(newRevision.id);
        await slackService.sendMessage(
          `:leftwards_arrow_with_hook: *SOW Recalled for Edits*\n\n` +
            `*Client:* ${sow.client_name || 'Unknown Client'}\n` +
            `*Previous Version:* v${sow.version || 1}\n` +
            `*New Draft:* v${newRevision.version}\n` +
            `*Recalled by:* ${session.user.email}\n\n` +
            `:link: <${sowUrl}|Edit New Draft>\n\n` +
            `The previous submission has been archived. Continue editing the new draft revision.`
        );
      }
    } catch (notificationError) {
      console.error('Slack notification failed for SOW recall:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: `SOW recalled. New draft revision v${newRevision.version} created.`,
      newRevision,
      newRevisionId: newRevision.id,
    });
  } catch (error) {
    console.error('Error recalling SOW:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


