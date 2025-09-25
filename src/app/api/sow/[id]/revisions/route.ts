import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface UserInfo {
  name: string;
  email: string;
}

interface SOWRevision {
  id: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
  rejected_at: string | null;
  approved_at: string | null;
  approval_comments: string | null;
  author_id: string | null;
  rejected_by: string | null;
  approved_by: string | null;
  users: UserInfo | null;
  rejector: UserInfo | null;
  approver: UserInfo | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceRoleClient();

    // Get the SOW to find its parent_id or use the current ID
    const { data: sow, error: sowError } = await supabase
      .from('sows')
      .select('parent_id')
      .eq('id', id)
      .single();

    if (sowError || !sow) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Find the root SOW ID (either parent_id or current id)
    const rootSowId = sow.parent_id || id;

    // Get all revisions for this SOW (including the root)
    const { data: revisions, error: revisionsError } = await supabase
      .from('sows')
      .select(`
        id,
        version,
        status,
        created_at,
        updated_at,
        rejected_at,
        approved_at,
        approval_comments,
        author_id,
        rejected_by,
        approved_by,
        users!author_id(name, email),
        rejector:users!rejected_by(name, email),
        approver:users!approved_by(name, email)
      `)
      .or(`id.eq.${rootSowId},parent_id.eq.${rootSowId}`)
      .order('version', { ascending: true }) as { data: SOWRevision[] | null; error: Error | null };

    if (revisionsError) {
      console.error('Error fetching revisions:', revisionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch revisions' 
      }, { status: 500 });
    }

    // Format the revisions data
    const formattedRevisions = revisions?.map(revision => ({
      id: revision.id,
      version: revision.version,
      status: revision.status,
      created_at: revision.created_at,
      updated_at: revision.updated_at,
      rejected_at: revision.rejected_at,
      approved_at: revision.approved_at,
      approval_comments: revision.approval_comments,
      author: revision.users ? {
        name: revision.users.name,
        email: revision.users.email
      } : null,
      rejected_by: revision.rejector ? {
        name: revision.rejector.name,
        email: revision.rejector.email
      } : null,
      approved_by: revision.approver ? {
        name: revision.approver.name,
        email: revision.approver.email
      } : null,
    })) || [];

    return NextResponse.json({
      revisions: formattedRevisions,
      total: formattedRevisions.length
    });

  } catch (error) {
    console.error('Error fetching SOW revisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
