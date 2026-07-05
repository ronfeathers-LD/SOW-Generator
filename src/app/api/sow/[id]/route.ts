import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSlackService } from '@/lib/slack';
import { getEmailService } from '@/lib/email';
import { getSOWUrl } from '@/lib/utils/app-url';
import { authOptions } from '@/lib/auth';
import { mapSowRowToResponse } from '@/lib/sow/map-sow-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication. Without this any caller who guesses a SOW UUID
    // could read the full SOW (billing, pricing, signer emails, Salesforce
    // account data) unauthenticated. Read access across authenticated users is
    // intentional for this internal tool; unauthenticated access is not.
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: sow, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .eq('is_hidden', false) // Prevent access to hidden SOWs
      .single();

    if (error || !sow) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }




    // Fetch LeanData signatory if one is selected
    let leanDataSignatory = null;
    if (sow.leandata_signatory_id) {
      const { data: signatory, error: signatoryError } = await supabase
        .from('lean_data_signatories')
        .select('*')
        .eq('id', sow.leandata_signatory_id)
        .eq('is_active', true)
        .single();
      
      if (!signatoryError && signatory) {
        leanDataSignatory = signatory;
      }
    }

    // Fetch Avoma recordings for this SOW
    const { data: avomaRecordings, error: recordingsError } = await supabase
      .from('avoma_recordings')
      .select('*')
      .eq('sow_id', (await params).id)
      .order('created_at', { ascending: true });

    if (recordingsError) {
      console.error('Error fetching Avoma recordings:', recordingsError);
    }

    // Fetch submission information if SOW was submitted for review
    let submittedByName = null;
    if (sow.submitted_by) {
      const { data: submitter, error: submitterError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', sow.submitted_by)
        .single();
      
      if (!submitterError && submitter) {
        submittedByName = submitter.name || submitter.email || 'Unknown User';
      }
    }

    // Map the raw row into the nested response shape via the single canonical
    // serializer (see src/lib/sow/map-sow-response.ts). Post-mapping mutations
    // (account-segment backfill, Salesforce client_name sync) still happen below.
    const transformedSow = mapSowRowToResponse(sow, {
      leanDataSignatory,
      avomaRecordings,
      submittedByName,
    });


    // 🔧 FIX: If account_segment is missing but we have salesforce_account_id, fetch it
    if (!sow.account_segment && sow.salesforce_account_id) {
      try {
        console.log('🔧 FIX: Fetching missing account segment from Salesforce...');
        const { getAuthenticatedSalesforceClient } = await import('@/lib/salesforce-server');
        const salesforceClient = await getAuthenticatedSalesforceClient(supabase);

        if (salesforceClient) {
          const account = await salesforceClient.getAccount(sow.salesforce_account_id);
          
          if (account.Employee_Band__c) {
            console.log(`🔧 FIX: Found account segment: ${account.Employee_Band__c}, updating SOW...`);
            
            // Update the SOW with the account segment
            await supabase
              .from('sows')
              .update({ account_segment: account.Employee_Band__c })
              .eq('id', sow.id);
            
            // Update the local sow object
            sow.account_segment = account.Employee_Band__c;
            // Also update the transformedSow object
            transformedSow.account_segment = account.Employee_Band__c;
            console.log(`🔧 FIX: SOW updated with account segment: ${account.Employee_Band__c}`);
          }
        }
      } catch (error) {
        console.error('🔧 FIX: Error fetching account segment:', error);
      }
    }
    
    // Fetch Salesforce data for this SOW
    const { data: salesforceData, error: salesforceError } = await supabase
      .from('sow_salesforce_data')
      .select('*')
      .eq('sow_id', (await params).id)
      .single();

    if (salesforceError && salesforceError.code !== 'PGRST116') {
      console.error('Error fetching Salesforce data:', salesforceError);
    }

    // Sync client_name from Salesforce if it's different
    if (salesforceData?.account_data?.name && salesforceData.account_data.name !== sow.client_name) {
      try {
        await supabase
          .from('sows')
          .update({ 
            client_name: salesforceData.account_data.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', (await params).id);
        
        // Update the transformed data to reflect the change
        transformedSow.client_name = salesforceData.account_data.name;
        transformedSow.template.client_name = salesforceData.account_data.name;

        console.log(`✅ Synced client_name from Salesforce: "${salesforceData.account_data.name}"`);
      } catch (syncError) {
        console.error('Error syncing client_name from Salesforce:', syncError);
      }
    }

    
    return NextResponse.json({
      ...transformedSow,
      salesforce_data: salesforceData || null
    });
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOW' },
      { status: 500 }
    );
  }
}

// Legal SOW status transitions. A status change not listed here is rejected,
// so e.g. a manager cannot jump a draft straight to 'approved', re-approve an
// already-approved SOW, or approve/reject something that isn't in review.
// Approval outcomes ('approved'/'rejected') are intentionally NOT reachable
// through this endpoint. ApprovalWorkflowService is the single writer of those
// statuses — the per-stage workflow (PS → optional PM → Sr. Leadership) is the
// only path, so one manager click can never bypass required approvers, and
// sows.status can't diverge from sow_approvals. Admin overrides go through
// POST /api/sow/[id]/force-approve, which writes consistent stage rows and an
// audit entry. (audit #56/#63)
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['recalled', 'draft'],
  rejected: ['in_review', 'draft'],
  recalled: ['in_review', 'draft'],
  approved: [], // terminal via this endpoint (revisions go through their own route)
};

// PUT - Update SOW (including status changes)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const data = await request.json();
    
    // Approval outcomes must go through the stage workflow (or the audited
    // admin force-approve endpoint) — never a direct status write.
    if (data.status === 'approved' || data.status === 'rejected') {
      return NextResponse.json(
        { error: 'SOWs are approved or rejected through the approval workflow, not a direct status update.' },
        { status: 403 }
      );
    }

    // Allow status updates and Account Segment updates
    if (
      data.status &&
      !['draft', 'in_review', 'recalled'].includes(data.status)
    ) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Fetch the current SOW and validate any requested status transition.
    const { data: currentSOW, error: currentErr } = await supabase
      .from('sows')
      .select('status, author_id, salesforce_account_owner_name, salesforce_account_owner_email')
      .eq('id', id)
      .single();

    if (currentErr || !currentSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    if (data.status && data.status !== currentSOW.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[currentSOW.status] || [];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          { error: `Cannot change status from '${currentSOW.status}' to '${data.status}'` },
          { status: 409 }
        );
      }
    }

    // Prepare update data - only allow specific fields to be updated.
    // approved_at / rejected_at are intentionally NOT caller-settable; they are
    // stamped server-side below so timestamps can't be spoofed.
    const allowedFields = ['status', 'salesforce_account_id', 'salesforce_account_owner_name', 'salesforce_account_owner_email', 'account_segment', 'approval_comments', 'payment_terms'];
    const updateData: Record<string, unknown> = {};
    
    // Only include fields that are allowed and provided
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });
    
    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Anyone can submit for review (draft → in_review)
    if (data.status === 'in_review') {
      // Account owner information must be present before submission.
      if (!currentSOW.salesforce_account_owner_name || !currentSOW.salesforce_account_owner_email) {
        return NextResponse.json(
          { error: 'Cannot submit for review: Account owner information is missing. Please re-select the account to capture owner details.' },
          { status: 400 }
        );
      }
      // Track who submitted the SOW for review
      updateData.submitted_by = user.id;
      updateData.submitted_at = new Date().toISOString();
    }

    // Update the SOW
    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating SOW status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW status' },
        { status: 500 }
      );
    }

    // Capture content snapshots on the actual transition TO in_review
    // (draft/rejected/recalled → in_review per ALLOWED_STATUS_TRANSITIONS;
    // the guard on currentSOW.status skips redundant in_review → in_review
    // PUTs, which the transition map doesn't reach because the status didn't
    // change). This is the ONLY server code path that sets status to
    // 'in_review' — verified by grepping src/app and src/lib: the recall
    // route and revision routes only ever set 'draft', and
    // approval-workflow-service only writes 'approved'/'rejected'.
    //
    // Failure policy (#347): a snapshot failure must NOT fail the submit —
    // anchored comments simply degrade gracefully without snapshots.
    if (data.status === 'in_review' && currentSOW.status !== 'in_review') {
      try {
        const { captureContentSnapshots } = await import('@/lib/sow-snapshot-service');
        await captureContentSnapshots(id, supabase);
      } catch (snapshotError) {
        console.error(
          `SNAPSHOT CAPTURE FAILED for SOW ${id} on submit-for-review — continuing; anchored comments will lack a content snapshot for this submission:`,
          snapshotError
        );
      }
    }

    // Initialize multi-step approval workflow when SOW is submitted for review
    if (data.status === 'in_review') {
      try {
        const { ApprovalWorkflowService } = await import('@/lib/approval-workflow-service');
        const workflowResult = await ApprovalWorkflowService.initiateWorkflow(id, supabase);
        
        if (!workflowResult.success) {
          console.error('Failed to initialize approval workflow:', workflowResult.error);
          // Don't fail the submission if workflow init fails
        }
      } catch (workflowError) {
        console.error('Error initializing approval workflow:', workflowError);
        // Don't fail the submission if workflow init fails
      }
    }

    // Send Slack notification when SOW is submitted for review
    if (data.status === 'in_review') {
      try {
        const slackService = await getSlackService();
        if (slackService) {
          // Get SOW details for the notification
          const { data: sowDetails } = await supabase
            .from('sows')
            .select('client_name, author_id, template, sow_title')
            .eq('id', id)
            .single();

          if (sowDetails) {
            // Get the current user who is submitting for review (not the original author)
            let submitterName = 'Unknown User';
            if (session?.user?.email) {
              const { data: submitter } = await supabase
                .from('users')
                .select('name, email')
                .eq('email', session.user.email)
                .single();
              if (submitter) {
                submitterName = submitter.name || submitter.email || 'Unknown User';
              } else {
                // Fallback to session email if user not found in database
                submitterName = session.user.email;
              }
            }

            // Get SOW title from either direct field or template
            const clientName = sowDetails.client_name || 'Unknown Client';
            const sowTitle = sowDetails.sow_title || 'Untitled SOW';
            const sowUrl = getSOWUrl(id);

            // Skip notifications for Hula Truck
            if (clientName.toLowerCase() !== 'hula truck') {
              await slackService.sendMessage(
                `:memo: *New SOW Submitted for Review*\n\n` +
                `*Client:* ${clientName}\n` +
                `*Submitted by:* ${submitterName}\n\n` +
                `:link: <${sowUrl}|Review SOW>\n\n` +
                `Please review and approve/reject this SOW when ready.`
              );
            }

            // Send email notification to commercial approvals team with account owner in CC
            try {
              const emailService = await getEmailService();
              if (emailService) {
                // Skip email notifications for Hula Truck
                if (clientName.toLowerCase() !== 'hula truck') {
                  // Get account owner email from SOW data
                  const { data: sowWithOwner } = await supabase
                    .from('sows')
                    .select('salesforce_account_owner_email')
                    .eq('id', id)
                    .single();

                  // Prepare CC emails (account owner if available)
                  const ccEmails: string[] = [];
                  if (sowWithOwner?.salesforce_account_owner_email) {
                    ccEmails.push(sowWithOwner.salesforce_account_owner_email);
                  }

                  // Send single email to commercial approvals team with account owner in CC
                  await emailService.sendSOWApprovalNotification(
                    id,
                    sowTitle,
                    clientName,
                    'sowapprovalscommercial@leandata.com',
                    submitterName,
                    ccEmails
                  );
                }
              }
            } catch (emailError) {
              console.error('Email notification failed for SOW submission:', emailError);
              // Don't fail the main operation if email notification fails
            }
          }
        }
      } catch (slackError) {
        console.error('Slack notification failed for SOW submission:', slackError);
        // Don't fail the main operation if Slack notification fails
      }
    }

    // Approved/rejected notifications live in ApprovalWorkflowService (the
    // single writer of those statuses); this endpoint no longer handles them.

    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW status:', error);
    return NextResponse.json(
      { error: 'Failed to update SOW status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to hide SOWs' }, { status: 403 });
    }

    const { id } = await params;

    // The id is interpolated into a PostgREST .or() filter below — restrict it
    // to a UUID so filter syntax can never be injected via the route param.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid SOW id' }, { status: 400 });
    }

    // Find the SOW to ensure it exists and check its status
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Note: only admins reach this point (403 above), and admins are allowed
    // to hide approved SOWs. A previous "approved SOWs are protected" branch
    // here was unreachable dead code (it checked role !== 'admin' after the
    // admin-only gate) and implied a protection that never existed.

    // Determine if this is hiding a single revision or the entire SOW family
    const isRevision = existingSOW.parent_id !== null;
    
    let totalSOWs = 1;
    let hideQuery;

    if (isRevision) {
      // Hiding a single revision - only hide this specific SOW
      hideQuery = supabase
        .from('sows')
        .update({ is_hidden: true })
        .eq('id', id);
    } else {
      // Hiding the original SOW - hide the entire family (original + all revisions)
      const { data: allRelatedSOWs } = await supabase
        .from('sows')
        .select('id')
        .or(`id.eq.${id},parent_id.eq.${id}`)
        .eq('is_hidden', false);
      
      totalSOWs = allRelatedSOWs ? allRelatedSOWs.length : 1;
      
      hideQuery = supabase
        .from('sows')
        .update({ is_hidden: true })
        .or(`id.eq.${id},parent_id.eq.${id}`);
    }

    // Execute the hide operation
    const { error: hideError } = await hideQuery;

    if (hideError) {
      console.error('Error hiding SOW:', hideError);
      return NextResponse.json(
        { error: 'Failed to hide SOW' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'SOW hidden successfully',
      hiddenVersions: totalSOWs
    });
  } catch (error) {
    console.error('Error hiding SOW:', error);
    return NextResponse.json(
      { error: 'Failed to hide SOW' },
      { status: 500 }
    );
  }
}

 