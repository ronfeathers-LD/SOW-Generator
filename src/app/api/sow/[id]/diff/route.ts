import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authOptions } from '@/lib/auth';
import { ChangelogService } from '@/lib/changelog-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const compareWithId = searchParams.get('compareWith');

    if (!compareWithId) {
      return NextResponse.json(
        { error: 'compareWith parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get both SOWs
    const { data: sow1, error: error1 } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    const { data: sow2, error: error2 } = await supabase
      .from('sows')
      .select('*')
      .eq('id', compareWithId)
      .single();

    if (error1 || !sow1) {
      return NextResponse.json({ error: 'First SOW not found' }, { status: 404 });
    }

    if (error2 || !sow2) {
      return NextResponse.json({ error: 'Second SOW not found' }, { status: 404 });
    }

    // Verify both SOWs are related (same parent or one is parent of the other)
    const rootId1 = sow1.parent_id || sow1.id;
    const rootId2 = sow2.parent_id || sow2.id;

    if (rootId1 !== rootId2) {
      return NextResponse.json(
        { error: 'SOWs are not related revisions' },
        { status: 400 }
      );
    }

    // Use ChangelogService to compare (exclude approval-related fields)
    const sow1Filtered = { ...sow1 };
    const sow2Filtered = { ...sow2 };
    
    // Remove approval-related fields for cleaner diff
    delete sow1Filtered.approved_by;
    delete sow1Filtered.rejected_by;
    delete sow1Filtered.submitted_by;
    delete sow1Filtered.approved_at;
    delete sow1Filtered.rejected_at;
    delete sow1Filtered.submitted_at;
    delete sow1Filtered.approval_comments;
    
    delete sow2Filtered.approved_by;
    delete sow2Filtered.rejected_by;
    delete sow2Filtered.submitted_by;
    delete sow2Filtered.approved_at;
    delete sow2Filtered.rejected_at;
    delete sow2Filtered.submitted_at;
    delete sow2Filtered.approval_comments;

    const changes = ChangelogService.compareSOWsForDiff(sow1Filtered, sow2Filtered);

    // Filter out status changes - status is already shown in the revision info header
    const filteredChanges = changes.filter(change => 
      change.field_name !== 'status' && change.change_type !== 'status_change'
    );

    return NextResponse.json({
      sow1: {
        id: sow1.id,
        version: sow1.version,
        status: sow1.status,
        created_at: sow1.created_at
      },
      sow2: {
        id: sow2.id,
        version: sow2.version,
        status: sow2.status,
        created_at: sow2.created_at
      },
      changes: filteredChanges.sort((a, b) => {
        // Sort by change type, then by field name
        const typeOrder: Record<string, number> = { 'field_update': 0, 'content_edit': 1, 'status_change': 2 };
        const typeDiff = (typeOrder[a.change_type] ?? 2) - (typeOrder[b.change_type] ?? 2);
        return typeDiff !== 0 ? typeDiff : a.field_name.localeCompare(b.field_name);
      }),
      totalChanges: filteredChanges.length
    });

  } catch (error) {
    console.error('Error comparing SOWs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

