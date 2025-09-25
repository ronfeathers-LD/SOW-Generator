import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSlackService } from '@/lib/slack';
import { getEmailService } from '@/lib/email';
import { getSOWUrl } from '@/lib/utils/app-url';

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




    // Get products from JSONB field
    const productNames = Array.isArray(sow.products) ? sow.products : [];

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

    // Transform recordings to match frontend format
    const transformedRecordings = (avomaRecordings || []).map(recording => ({
      id: recording.id,
      url: recording.url,
      transcription: recording.transcription || '',
      title: recording.title || '',
      date: recording.date || recording.created_at,
      status: recording.status || 'pending'
    }));

    // Return snake_case data directly with nested structure
    const transformedSow = {
      ...sow,
      objectives: {
        description: sow.objectives_description || '',
        key_objectives: sow.objectives_key_objectives || [],
        avoma_transcription: sow.avoma_transcription || '',
        avoma_url: sow.avoma_url || '',
        avoma_recordings: transformedRecordings,
      },
      scope: {

        deliverables: sow.deliverables || '',
        timeline: {
          duration: sow.duration || '',
        },
      },
      template: {
        client_name: sow.client_name || '',
        customer_signature_name: sow.client_signer_name || '',
        customer_email: sow.client_email || '',
        customer_signature: sow.client_title || '', // Add this missing mapping!
        lean_data_name: leanDataSignatory?.name || sow.leandata_name || '',
        lean_data_title: leanDataSignatory?.title || sow.leandata_title || '',
        lean_data_email: leanDataSignatory?.email || sow.leandata_email || '',
        products: productNames,
        regions: sow.regions || '999',
        salesforce_tenants: sow.salesforce_tenants || '999',
        timeline_weeks: sow.timeline_weeks || '999',
        units_consumption: sow.units_consumption || 'All units immediately',
        // BookIt Family Units
        orchestration_units: sow.orchestration_units || '',
        bookit_forms_units: sow.bookit_forms_units || '',
        bookit_links_units: sow.bookit_links_units || '',
        bookit_handoff_units: sow.bookit_handoff_units || '',
        other_products_units: sow.other_products_units || '',
        opportunity_id: sow.opportunity_id || '',
        opportunity_name: sow.opportunity_name || '',
        opportunity_amount: sow.opportunity_amount || undefined,
        opportunity_stage: sow.opportunity_stage || '',
        opportunity_close_date: sow.opportunity_close_date || undefined,
        // Second signer information
        customer_signature_name_2: sow.customer_signature_name_2 || '',
        customer_signature_2: sow.customer_signature_2 || '',
        customer_email_2: sow.customer_email_2 || '',

        // Billing information - map from billing_info JSONB field
        billing_company_name: (sow.billing_info as Record<string, unknown>)?.company_name || '',
        billing_contact_name: (sow.billing_info as Record<string, unknown>)?.billing_contact || '',
        billing_address: (sow.billing_info as Record<string, unknown>)?.billing_address || '',
        billing_email: (sow.billing_info as Record<string, unknown>)?.billing_email || '',
        purchase_order_number: (sow.billing_info as Record<string, unknown>)?.po_number || '',
      },
      header: {
        company_logo: sow.company_logo || '',
        client_name: sow.client_name || '',
        sow_title: sow.sow_title || '',
      },
      client_signature: {
        name: sow.client_signer_name || '',
        title: sow.client_title || '',
        email: sow.client_email || '',
        signature_date: sow.signature_date ? new Date(sow.signature_date) : new Date(),
      },
      client_signer_name: sow.client_signer_name || '',
      // Explicitly include salesforce_account_id
      salesforce_account_id: sow.salesforce_account_id || null,
      // Include Salesforce account owner information
      salesforce_account_owner_name: sow.salesforce_account_owner_name || null,
      salesforce_account_owner_email: sow.salesforce_account_owner_email || null,
      // Include LeanData signatory ID
      leandata_signatory_id: sow.leandata_signatory_id || null,
      // Include custom content fields
      custom_intro_content: sow.custom_intro_content || null,
      custom_scope_content: sow.custom_scope_content || null,
      custom_objectives_disclosure_content: sow.custom_objectives_disclosure_content || null,
      custom_assumptions_content: sow.custom_assumptions_content || null,
      custom_project_phases_content: sow.custom_project_phases_content || null,
      custom_deliverables_content: sow.custom_deliverables_content || null,
      custom_objective_overview_content: sow.custom_objective_overview_content || null,
      custom_key_objectives_content: sow.custom_key_objectives_content || null,
      intro_content_edited: sow.intro_content_edited || false,
      scope_content_edited: sow.scope_content_edited || false,
      objectives_disclosure_content_edited: sow.objectives_disclosure_content_edited || false,
      assumptions_content_edited: sow.assumptions_content_edited || false,
      project_phases_content_edited: sow.project_phases_content_edited || false,
      deliverables_content_edited: sow.deliverables_content_edited || false,
      objective_overview_content_edited: sow.objective_overview_content_edited || false,
      key_objectives_content_edited: sow.key_objectives_content_edited || false,
      // Include submission tracking
      submitted_by: sow.submitted_by || null,
      submitted_at: sow.submitted_at || null,
      submitted_by_name: submittedByName,
      // Include client roles
      roles: {
        client_roles: sow.client_roles || []
      },
      // Include pricing data - handle mixed structure where pricing_roles contains both roles and config
      pricingRoles: (() => {
        if (Array.isArray(sow.pricing_roles)) {
          // If it's an array, return it directly (old format)
          return sow.pricing_roles;
        } else if (sow.pricing_roles && typeof sow.pricing_roles === 'object' && sow.pricing_roles.roles) {
          // If it's an object with a roles property, return the roles array
          return sow.pricing_roles.roles;
        } else {
          // Otherwise return empty array
          return [];
        }
      })(),
      billingInfo: sow.billing_info || {},
      // Include pricing configuration from JSONB fields
      pricing: {
        project_management_included: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.project_management_included || false : false,
        project_management_hours: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.project_management_hours || 40 : 40,
        project_management_rate: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.project_management_rate || 225 : 225,
        base_hourly_rate: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.base_hourly_rate || 200 : 200,
        discount_type: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.discount_type || 'none' : 'none',
        discount_amount: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.discount_amount || 0 : 0,
        discount_percentage: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.discount_percentage || 0 : 0,
        subtotal: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.subtotal || 0 : 0,
        discount_total: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.discount_total || 0 : 0,
        total_amount: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.total_amount || 0 : 0,
        auto_calculated: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.auto_calculated || false : false,
        last_calculated: (sow.pricing_roles && typeof sow.pricing_roles === 'object' && !Array.isArray(sow.pricing_roles)) ? sow.pricing_roles.last_calculated || null : null,
      },
    };

    console.log('SOW GET: rejected_at field:', sow.rejected_at);
    console.log('SOW GET: status field:', sow.status);
    
    return NextResponse.json(transformedSow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOW' },
      { status: 500 }
    );
  }
}

// PUT - Update SOW (including status changes)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
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
    if (data.status && !['draft', 'in_review', 'approved', 'rejected'].includes(data.status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Prepare update data - only allow specific fields to be updated
    const allowedFields = ['status', 'salesforce_account_id', 'salesforce_account_owner_name', 'salesforce_account_owner_email'];
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
      // Check if account owner information is available before allowing submission
      const { data: currentSOW } = await supabase
        .from('sows')
        .select('salesforce_account_owner_name, salesforce_account_owner_email')
        .eq('id', id)
        .single();
      
      if (!currentSOW?.salesforce_account_owner_name || !currentSOW?.salesforce_account_owner_email) {
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
      // Ensure rejected_at is set if not already provided
      if (!data.rejected_at) {
        updateData.rejected_at = new Date().toISOString();
        console.log('SOW Rejection: Set rejected_at to:', updateData.rejected_at);
      }
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
            if (clientName.toLowerCase() === 'hula truck') {
              console.log('🚫 Skipping Slack notification for Hula Truck SOW submission');
            } else {
              await slackService.sendMessage(
                `:memo: *New SOW Submitted for Review*\n\n` +
                `*Client:* ${clientName}\n` +
                `*Submitted by:* ${submitterName}\n\n` +
                `:link: <${sowUrl}|Review SOW>\n\n` +
                `Please review and approve/reject this SOW when ready.`
              );
            }

            // Send email notification to account owner or commercial approvals team
            try {
              const emailService = await getEmailService();
              if (emailService) {
                // Skip email notifications for Hula Truck
                if (clientName.toLowerCase() === 'hula truck') {
                  console.log('🚫 Skipping email notification for Hula Truck SOW submission');
                } else {
                  // Get account owner email from SOW data
                  const { data: sowWithOwner } = await supabase
                    .from('sows')
                    .select('salesforce_account_owner_email')
                    .eq('id', id)
                    .single();

                  // Use account owner email if available, otherwise fall back to commercial approvals
                  const approverEmail = sowWithOwner?.salesforce_account_owner_email || 'sowapprovalscommercial@leandata.com';
                  
                  await emailService.sendSOWApprovalNotification(
                    id,
                    sowTitle,
                    clientName,
                    approverEmail,
                    submitterName
                  );
                  console.log(`✅ Email notification sent to ${approverEmail}`);
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

    // Send notifications when SOW is rejected
    if (data.rejected_at) {
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

          // Send email notification to SOW author
          if (authorEmail) {
            try {
              const emailService = await getEmailService();
              if (emailService) {
                await emailService.sendSOWStatusNotification(
                  id,
                  sowTitle,
                  clientName,
                  authorEmail,
                  'rejected',
                  session.user.email || 'Unknown Approver',
                  comments
                );
                console.log('SOW rejection email sent to author:', authorEmail);
              }
            } catch (emailError) {
              console.error('Email notification failed for SOW rejection:', emailError);
            }
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
    const session = await getServerSession();
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

    // Prevent hiding of approved SOWs
    if (existingSOW.status === 'approved') {
      return NextResponse.json({ 
        error: 'Cannot hide approved SOWs. Approved SOWs are protected.' 
      }, { status: 403 });
    }

    // Check for versions
    const { data: versions } = await supabase
      .from('sows')
      .select('id')
      .eq('parent_id', id);

    const hasVersions = versions && versions.length > 0;

    // Soft delete: Hide the SOW and all its versions by setting is_hidden = true
    const { error: hideError } = await supabase
      .from('sows')
      .update({ is_hidden: true })
      .or(`id.eq.${id},parent_id.eq.${id}`);

    if (hideError) {
      console.error('Error hiding SOW:', hideError);
      return NextResponse.json(
        { error: 'Failed to hide SOW' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'SOW hidden successfully',
      hiddenVersions: hasVersions ? versions?.length + 1 : 1
    });
  } catch (error) {
    console.error('Error hiding SOW:', error);
    return NextResponse.json(
      { error: 'Failed to hide SOW' },
      { status: 500 }
    );
  }
}

 