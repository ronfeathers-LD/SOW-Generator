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
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected', 'recalled', 'draft'],
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
    
    // Allow status updates and Account Segment updates
    if (
      data.status &&
      !['draft', 'in_review', 'approved', 'rejected', 'recalled'].includes(data.status)
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
    const allowedFields = ['status', 'salesforce_account_id', 'salesforce_account_owner_name', 'salesforce_account_owner_email', 'account_segment', 'approval_comments'];
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
    }
    // Only managers/admins can approve/reject
    else if (data.status === 'approved' || data.status === 'rejected') {
      if (user.role !== 'admin' && user.role !== 'manager') {
        return NextResponse.json({ error: 'Manager or Admin access required to approve/reject SOWs' }, { status: 403 });
      }
    }

    // If rejecting, keep status as rejected and set rejection tracking
    if (data.status === 'rejected') {
      updateData.status = 'rejected';
      // Server-stamped, not caller-supplied.
      updateData.rejected_at = new Date().toISOString();
    }

    // Add approval tracking
    if (data.status === 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    } else if (data.status === 'rejected') {
      // This was a rejection, track who rejected it
      updateData.rejected_by = user.id;
    } else if (data.status === 'in_review') {
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

    // Send Slack notification when SOW is approved
    if (data.status === 'approved') {
      try {
        const slackService = await getSlackService();
        if (slackService) {
          // Get SOW details for the notification
          const { data: sowDetails } = await supabase
            .from('sows')
            .select('client_name, author_id, template')
            .eq('id', id)
            .single();

          if (sowDetails) {
            // Get author name if available
            let authorName = 'Unknown User';
            if (sowDetails.author_id) {
              const { data: author } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', sowDetails.author_id)
                .single();
              if (author) {
                authorName = author.name || author.email || 'Unknown User';
              }
            }

            // Get SOW title from either direct field or template
            const clientName = sowDetails.client_name || 'Unknown Client';
            const sowUrl = getSOWUrl(id);

            await slackService.sendMessage(
              `:white_check_mark: *SOW Approved*\n\n` +
              `*Client:* ${clientName}\n` +
              `*Submitted by:* ${authorName}\n` +
              `*Approved by:* ${session.user.email}\n\n` +
              `:link: <${sowUrl}|View SOW>\n\n` +
              `This SOW is now ready for client signature.`
            );
          }
        }
      } catch (slackError) {
        console.error('Slack notification failed for SOW approval:', slackError);
        // Don't fail the main operation if Slack notification fails
      }
    }

    // Send notifications when SOW is rejected. Trigger on the actual status
    // transition, not a caller-supplied rejected_at field. (audit #57)
    if (data.status === 'rejected') {
      try {
        // Get SOW details for the notification
        const { data: sowDetails } = await supabase
          .from('sows')
          .select('sow_title, client_name, author_id')
          .eq('id', id)
          .single();

        if (sowDetails) {
          // Get author information
          let authorName = 'Unknown User';
          let authorEmail = '';
          if (sowDetails.author_id) {
            const { data: author } = await supabase
              .from('users')
              .select('name, email')
              .eq('id', sowDetails.author_id)
              .single();
            if (author) {
              authorName = author.name || author.email || 'Unknown User';
              authorEmail = author.email || '';
            }
          }

          const clientName = sowDetails.client_name || 'Unknown Client';
          const sowTitle = sowDetails.sow_title || 'Untitled SOW';
          const sowUrl = getSOWUrl(id);
          const comments = data.approval_comments || 'No comments provided';

          // Send Slack notification
          try {
            const slackService = await getSlackService();
            if (slackService) {
              await slackService.sendMessage(
                `:x: *SOW Rejected*\n\n` +
                `*Client:* ${clientName}\n` +
                `*Submitted by:* ${authorName}\n` +
                `*Rejected by:* ${session.user.email}\n` +
                `*Comments:* ${comments}\n\n` +
                `:link: <${sowUrl}|View SOW>\n\n` +
                `The SOW author can create a new revision to address the feedback and resubmit for approval.`
              );
            }
          } catch (slackError) {
            console.error('Slack notification failed for SOW rejection:', slackError);
          }

          // Send email notifications for SOW rejection
          try {
            const emailService = await getEmailService();
            if (emailService) {
              // Get account owner email for CC
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

              // Send email to commercial approvals team with account owner in CC
              await emailService.sendSOWStatusNotification(
                id,
                sowTitle,
                clientName,
                'sowapprovalscommercial@leandata.com',
                'rejected',
                session.user.email || 'Unknown Approver',
                comments,
                ccEmails
              );

              // Also send email to SOW author if available
              if (authorEmail) {
                await emailService.sendSOWStatusNotification(
                  id,
                  sowTitle,
                  clientName,
                  authorEmail,
                  'rejected',
                  session.user.email || 'Unknown Approver',
                  comments
                );
              }
            }
          } catch (emailError) {
            console.error('Email notification failed for SOW rejection:', emailError);
          }
        }
      } catch (error) {
        console.error('Error sending SOW rejection notifications:', error);
        // Don't fail the main operation if notifications fail
      }
    }

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
    
    // Find the SOW to ensure it exists and check its status
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Prevent hiding of approved SOWs for non-admin users
    if (existingSOW.status === 'approved' && user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Cannot hide approved SOWs. Approved SOWs are protected.' 
      }, { status: 403 });
    }

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

 