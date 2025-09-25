import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(
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

    // Get the original SOW
    const { data: originalSOW, error: fetchError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Check if the SOW is rejected
    if (originalSOW.status !== 'rejected') {
      return NextResponse.json({ 
        error: 'Can only create revisions from rejected SOWs' 
      }, { status: 400 });
    }

    // Check if user has permission (author or admin/manager)
    const user = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!user.data || (user.data.role !== 'admin' && user.data.role !== 'manager' && originalSOW.author_id !== session.user.id)) {
      return NextResponse.json({ 
        error: 'Permission denied. Only the SOW author or admin/manager can create revisions.' 
      }, { status: 403 });
    }

    // Mark the original SOW as not latest
    await supabase
      .from('sows')
      .update({ is_latest: false })
      .eq('id', id);

    // Create the new revision
    const revisionData = {
      ...originalSOW,
      id: undefined, // Let database generate new ID
      parent_id: originalSOW.parent_id || originalSOW.id, // Set parent to original SOW
      version: originalSOW.version + 1,
      is_latest: true,
      status: 'draft',
      created_at: undefined, // Let database set new timestamp
      updated_at: undefined, // Let database set new timestamp
      approved_at: null,
      rejected_at: null,
      approved_by: null,
      rejected_by: null,
      approval_comments: null,
      submitted_at: null,
      submitted_by: null,
      author_id: session.user.id, // New revision created by current user
    };

    const { data: newRevision, error: createError } = await supabase
      .from('sows')
      .insert(revisionData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating SOW revision:', createError);
      return NextResponse.json({ 
        error: 'Failed to create revision' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      revision: newRevision,
      message: `New revision (v${newRevision.version}) created successfully`
    });

  } catch (error) {
    console.error('Error creating SOW revision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
