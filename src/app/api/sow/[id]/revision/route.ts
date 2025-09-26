import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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

    // 🔍 LOG: Original SOW account segment data
    console.log('🔍 REVISION CREATION - Original SOW Data:', {
      sowId: originalSOW.id,
      sowTitle: originalSOW.sow_title,
      clientName: originalSOW.client_name,
      account_segment: originalSOW.account_segment,
      salesforce_account_id: originalSOW.salesforce_account_id,
      salesforce_account_owner_name: originalSOW.salesforce_account_owner_name,
      salesforce_account_owner_email: originalSOW.salesforce_account_owner_email
    });

    // Check if the SOW is rejected
    if (originalSOW.status !== 'rejected') {
      return NextResponse.json({ 
        error: 'Can only create revisions from rejected SOWs' 
      }, { status: 400 });
    }

    // Check if user has permission (author or admin/manager)
    const user = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user.data || (user.data.role !== 'admin' && user.data.role !== 'manager' && originalSOW.author_id !== user.data.id)) {
      return NextResponse.json({ 
        error: 'Permission denied. Only the SOW author or admin/manager can create revisions.' 
      }, { status: 403 });
    }

    // Mark all related SOWs as not latest (including the original and all revisions)
    const rootSowId = originalSOW.parent_id || originalSOW.id;
    await supabase
      .from('sows')
      .update({ is_latest: false })
      .or(`id.eq.${rootSowId},parent_id.eq.${rootSowId}`);

    // Get the highest version number among all related SOWs
    const { data: latestVersion } = await supabase
      .from('sows')
      .select('version')
      .or(`id.eq.${rootSowId},parent_id.eq.${rootSowId}`)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Create the new revision
    const revisionData = {
      ...originalSOW,
      id: undefined, // Let database generate new ID
      parent_id: originalSOW.parent_id || originalSOW.id, // Set parent to original SOW
      version: (latestVersion?.version || 0) + 1,
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
      author_id: user.data.id, // New revision created by current user
    };

    // 🔍 LOG: Revision data being created
    console.log('🔍 REVISION CREATION - Revision Data:', {
      account_segment: revisionData.account_segment,
      salesforce_account_id: revisionData.salesforce_account_id,
      salesforce_account_owner_name: revisionData.salesforce_account_owner_name,
      salesforce_account_owner_email: revisionData.salesforce_account_owner_email,
      client_name: revisionData.client_name,
      sow_title: revisionData.sow_title,
      version: revisionData.version,
      parent_id: revisionData.parent_id
    });

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

    // 🔍 LOG: New revision created
    console.log('🔍 REVISION CREATION - New Revision Created:', {
      newRevisionId: newRevision.id,
      account_segment: newRevision.account_segment,
      salesforce_account_id: newRevision.salesforce_account_id,
      salesforce_account_owner_name: newRevision.salesforce_account_owner_name,
      salesforce_account_owner_email: newRevision.salesforce_account_owner_email,
      client_name: newRevision.client_name,
      sow_title: newRevision.sow_title,
      version: newRevision.version,
      parent_id: newRevision.parent_id
    });

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
