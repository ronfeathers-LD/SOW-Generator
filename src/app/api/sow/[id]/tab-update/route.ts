import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tab, data } = await request.json();
    const sowId = (await params).id;
    


    // Find the SOW to ensure it exists
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Build update data object based on the tab
    const updateData: Record<string, unknown> = {};

    switch (tab) {
      case 'Project Overview':
        // Handle project overview data
        if (data.template) {
          if (data.template.sow_title !== undefined) updateData.sow_title = data.template.sow_title;
          if (data.template.number_of_units !== undefined) updateData.number_of_units = data.template.number_of_units;
          if (data.template.regions !== undefined) updateData.regions = data.template.regions;
          if (data.template.salesforce_tenants !== undefined) updateData.salesforce_tenants = data.template.salesforce_tenants;
          if (data.template.timeline_weeks !== undefined) updateData.timeline_weeks = data.template.timeline_weeks;
          if (data.template.units_consumption !== undefined) updateData.units_consumption = data.template.units_consumption;
          
          // Handle BookIt Family Units
          if (data.template.orchestration_units !== undefined) updateData.orchestration_units = data.template.orchestration_units;
          if (data.template.bookit_forms_units !== undefined) updateData.bookit_forms_units = data.template.bookit_forms_units;
          if (data.template.bookit_links_units !== undefined) updateData.bookit_links_units = data.template.bookit_links_units;
          if (data.template.bookit_handoff_units !== undefined) updateData.bookit_handoff_units = data.template.bookit_handoff_units;
        }
        if (data.scope?.timeline) {
          if (data.scope.timeline.start_date !== undefined) updateData.start_date = new Date(data.scope.timeline.start_date).toISOString();
          if (data.scope.timeline.duration !== undefined) updateData.duration = data.scope.timeline.duration;
        }

        // Handle products - use JSONB field
        if (data.template?.products !== undefined) {
          updateData.products = data.template.products;
        }
        break;

      case 'Customer Information':
        // Handle customer information data
        if (data.template) {
          if (data.template.customer_name !== undefined) updateData.client_name = data.template.customer_name;
          if (data.template.customer_email !== undefined) updateData.client_email = data.template.customer_email;
          if (data.template.lean_data_name !== undefined) updateData.leandata_name = data.template.lean_data_name;
          if (data.template.lean_data_title !== undefined) updateData.leandata_title = data.template.lean_data_title;
          if (data.template.lean_data_email !== undefined) updateData.leandata_email = data.template.lean_data_email;
          if (data.template.opportunity_id !== undefined) updateData.opportunity_id = data.template.opportunity_id || null;
          if (data.template.opportunity_name !== undefined) updateData.opportunity_name = data.template.opportunity_name || null;
          if (data.template.opportunity_amount !== undefined) updateData.opportunity_amount = data.template.opportunity_amount || null;
          if (data.template.opportunity_stage !== undefined) updateData.opportunity_stage = data.template.opportunity_stage || null;
          if (data.template.opportunity_close_date !== undefined) updateData.opportunity_close_date = data.template.opportunity_close_date ? new Date(data.template.opportunity_close_date).toISOString() : null;
        }
        if (data.header) {
          if (data.header.company_logo !== undefined) updateData.company_logo = data.header.company_logo;
        }
        break;

      case 'Objectives':
        // Handle objectives data
        if (data.objectives) {
          if (data.objectives.description !== undefined) updateData.objectives_description = data.objectives.description;
          if (data.objectives.key_objectives !== undefined) updateData.objectives_key_objectives = data.objectives.key_objectives;
          if (data.objectives.avoma_transcription !== undefined) updateData.avoma_transcription = data.objectives.avoma_transcription;
          if (data.objectives.avoma_url !== undefined) updateData.avoma_url = data.objectives.avoma_url;
        }
        // Handle scope data (deliverables)
        if (data.scope) {
          if (data.scope.deliverables !== undefined) updateData.deliverables = data.scope.deliverables;
        }
        // Handle custom deliverables content
        if (data.custom_deliverables_content !== undefined) updateData.custom_deliverables_content = data.custom_deliverables_content;
        if (data.deliverables_content_edited !== undefined) updateData.deliverables_content_edited = data.deliverables_content_edited;
        // Handle custom objective overview content
        if (data.custom_objective_overview_content !== undefined) updateData.custom_objective_overview_content = data.custom_objective_overview_content;
        if (data.objective_overview_content_edited !== undefined) updateData.objective_overview_content_edited = data.objective_overview_content_edited;
        // Handle custom key objectives content
        if (data.custom_key_objectives_content !== undefined) updateData.custom_key_objectives_content = data.custom_key_objectives_content;
        if (data.key_objectives_content_edited !== undefined) updateData.key_objectives_content_edited = data.key_objectives_content_edited;
        break;

      case 'Team & Roles':
        // Handle team and roles data
        if (data.template) {
          if (data.template.customer_signature_name !== undefined) updateData.client_signer_name = data.template.customer_signature_name;
          if (data.template.customer_email !== undefined) updateData.client_email = data.template.customer_email;
          if (data.template.customer_signature !== undefined) updateData.client_title = data.template.customer_signature;
          // Second signer information
          if (data.template.customer_signature_name_2 !== undefined) updateData.customer_signature_name_2 = data.template.customer_signature_name_2;
          if (data.template.customer_signature_2 !== undefined) updateData.customer_signature_2 = data.template.customer_signature_2;
          if (data.template.customer_email_2 !== undefined) updateData.customer_email_2 = data.template.customer_email_2;
          if (data.template.customer_signature_date_2 !== undefined) updateData.customer_signature_date_2 = data.template.customer_signature_date_2;
        }
        if (data.roles?.client_roles !== undefined) updateData.client_roles = data.roles.client_roles;
        if (data.pricing?.roles !== undefined) updateData.pricing_roles = data.pricing.roles;

        // Handle Salesforce contact ID
        if (data.salesforce_contact_id !== undefined) {
          updateData.salesforce_contact_id = data.salesforce_contact_id;
        }

        // Handle LeanData signatory ID
        if (data.leandata_signatory_id !== undefined) {
          updateData.leandata_signatory_id = data.leandata_signatory_id;
        }
        break;

      case 'Billing & Payment':
        // Handle billing and payment data
        if (data.pricing?.billing !== undefined) updateData.billing_info = data.pricing.billing;
        if (data.assumptions) {
          if (data.assumptions.access_requirements !== undefined) updateData.access_requirements = data.assumptions.access_requirements;
          if (data.assumptions.travel_requirements !== undefined) updateData.travel_requirements = data.assumptions.travel_requirements;
          if (data.assumptions.working_hours !== undefined) updateData.working_hours = data.assumptions.working_hours;
          if (data.assumptions.testing_responsibilities !== undefined) updateData.testing_responsibilities = data.assumptions.testing_responsibilities;
        }
        break;

      case 'Content Editing':
        // Handle content editing data
        if (data.custom_intro_content !== undefined) updateData.custom_intro_content = data.custom_intro_content;
        if (data.custom_scope_content !== undefined) updateData.custom_scope_content = data.custom_scope_content;
        if (data.custom_objectives_disclosure_content !== undefined) updateData.custom_objectives_disclosure_content = data.custom_objectives_disclosure_content;
        if (data.custom_assumptions_content !== undefined) updateData.custom_assumptions_content = data.custom_assumptions_content;
        if (data.custom_project_phases_content !== undefined) updateData.custom_project_phases_content = data.custom_project_phases_content;
        if (data.custom_roles_content !== undefined) updateData.custom_roles_content = data.custom_roles_content;
        if (data.custom_deliverables_content !== undefined) updateData.custom_deliverables_content = data.custom_deliverables_content;
        if (data.custom_objective_overview_content !== undefined) updateData.custom_objective_overview_content = data.custom_objective_overview_content;
        if (data.intro_content_edited !== undefined) updateData.intro_content_edited = data.intro_content_edited;
        if (data.scope_content_edited !== undefined) updateData.scope_content_edited = data.scope_content_edited;
        if (data.objectives_disclosure_content_edited !== undefined) updateData.objectives_disclosure_content_edited = data.objectives_disclosure_content_edited;
        if (data.assumptions_content_edited !== undefined) updateData.assumptions_content_edited = data.assumptions_content_edited;
        if (data.project_phases_content_edited !== undefined) updateData.project_phases_content_edited = data.project_phases_content_edited;
        if (data.roles_content_edited !== undefined) updateData.roles_content_edited = data.roles_content_edited;
        if (data.deliverables_content_edited !== undefined) updateData.deliverables_content_edited = data.deliverables_content_edited;
        if (data.objective_overview_content_edited !== undefined) updateData.objective_overview_content_edited = data.objective_overview_content_edited;
        if (data.custom_key_objectives_content !== undefined) updateData.custom_key_objectives_content = data.custom_key_objectives_content;
        if (data.key_objectives_content_edited !== undefined) updateData.key_objectives_content_edited = data.key_objectives_content_edited;
        break;

      default:
        return NextResponse.json({ error: 'Invalid tab specified' }, { status: 400 });
    }

    // Update the SOW with the tab-specific data
    const { error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', sowId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `${tab} updated successfully`,
      sowId: sowId
    });

  } catch (error) {
    console.error('Error updating SOW tab:', error);
    return NextResponse.json(
      { error: 'Failed to update SOW tab' },
      { status: 500 }
    );
  }
} 