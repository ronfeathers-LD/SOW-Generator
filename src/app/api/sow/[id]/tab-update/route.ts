import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangelogService } from '@/lib/changelog-service';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
        console.log('🔍 Project Overview tab - incoming data:', JSON.stringify(data, null, 2));
        if (data.template) {
          if (data.template.sow_title !== undefined) {
            updateData.sow_title = data.template.sow_title;
            console.log('✅ Setting sow_title to:', data.template.sow_title);
          }
          if (data.template.regions !== undefined) updateData.regions = data.template.regions;
          if (data.template.salesforce_tenants !== undefined) updateData.salesforce_tenants = data.template.salesforce_tenants;
          if (data.template.timeline_weeks !== undefined) updateData.timeline_weeks = data.template.timeline_weeks;
          if (data.template.units_consumption !== undefined) updateData.units_consumption = data.template.units_consumption;
          
          // Handle BookIt Family Units
          if (data.template.bookit_forms_units !== undefined) updateData.bookit_forms_units = data.template.bookit_forms_units;
          if (data.template.bookit_links_units !== undefined) updateData.bookit_links_units = data.template.bookit_links_units;
          if (data.template.bookit_handoff_units !== undefined) updateData.bookit_handoff_units = data.template.bookit_handoff_units;
        }

        // Handle products - use JSONB field
        if (data.template?.products !== undefined) {
          updateData.products = data.template.products;
        }
        
        console.log('🔍 Project Overview tab - updateData:', JSON.stringify(updateData, null, 2));
        break;

      case 'Customer Information':
        // Handle customer information data
        if (data.template) {
          if (data.template.client_name !== undefined) updateData.client_name = data.template.client_name;
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

      case 'Signers & Roles':
        // Handle signers and roles data only
        // Check if data.template exists, otherwise look for template data at the top level
        const templateData = data.template || data;
        
        if (templateData) {
          if (templateData.customer_signature_name !== undefined) updateData.client_signer_name = templateData.customer_signature_name;
          if (templateData.customer_email !== undefined) updateData.client_email = templateData.customer_email;
          if (templateData.customer_signature !== undefined) updateData.client_title = templateData.customer_signature;
          // Second signer information
          if (templateData.customer_signature_name_2 !== undefined) updateData.customer_signature_name_2 = templateData.customer_signature_name_2;
          if (templateData.customer_signature_2 !== undefined) updateData.customer_signature_2 = templateData.customer_signature_2;
          if (templateData.customer_email_2 !== undefined) updateData.customer_email_2 = templateData.customer_email_2;
          // LeanData signatory information
          if (templateData.lean_data_name !== undefined) updateData.leandata_name = templateData.lean_data_name;
          if (templateData.lean_data_title !== undefined) updateData.leandata_title = templateData.lean_data_title;
          if (templateData.lean_data_email !== undefined) updateData.leandata_email = templateData.lean_data_email;
        }
        
        if (data.roles?.client_roles !== undefined) updateData.client_roles = data.roles.client_roles;

        // Handle Salesforce contact ID
        if (data.salesforce_contact_id !== undefined) {
          updateData.salesforce_contact_id = data.salesforce_contact_id;
        }

        // Handle LeanData signatory ID
        if (data.leandata_signatory_id !== undefined) {
          updateData.leandata_signatory_id = data.leandata_signatory_id;
        }
        break;

      case 'Billing Information':
        // Handle billing information data
        const billingTemplateData = data.template || data;
        
        if (billingTemplateData) {
          // Billing contact information - store in billing_info JSONB field
          if (billingTemplateData.billing_contact_name !== undefined || billingTemplateData.billing_email !== undefined ||
              billingTemplateData.billing_company_name !== undefined || billingTemplateData.billing_address !== undefined ||
              billingTemplateData.purchase_order_number !== undefined) {
            // Get existing billing_info or create new object
            const existingBillingInfo = updateData.billing_info || {};
            updateData.billing_info = {
              ...existingBillingInfo,
              billing_contact: billingTemplateData.billing_contact_name !== undefined ? 
                billingTemplateData.billing_contact_name : (existingBillingInfo as Record<string, unknown>).billing_contact,
              billing_email: billingTemplateData.billing_email !== undefined ? 
                billingTemplateData.billing_email : (existingBillingInfo as Record<string, unknown>).billing_email,
              company_name: billingTemplateData.billing_company_name !== undefined ? 
                billingTemplateData.billing_company_name : (existingBillingInfo as Record<string, unknown>).company_name,
              billing_address: billingTemplateData.billing_address !== undefined ? 
                billingTemplateData.billing_address : (existingBillingInfo as Record<string, unknown>).billing_address,
              po_number: billingTemplateData.purchase_order_number !== undefined ? 
                billingTemplateData.purchase_order_number : (existingBillingInfo as Record<string, unknown>).po_number,
            };
          }
        }
        
        if (data.pricing?.billing !== undefined) updateData.pricing_roles = data.pricing.billing;
        break;

      case 'Pricing':
        // Handle pricing configuration and calculated totals only
        if (data.pricing) {
          // Create a structured pricing object that preserves roles and configuration
          const pricingData: {
            roles: Array<{
              role: string;
              ratePerHour: number;
              totalHours: number;
              [key: string]: unknown;
            }>;
            subtotal?: number;
            discount_total?: number;
            total_amount?: number;
            discount_type?: string;
            discount_amount?: number;
            discount_percentage?: number;
            auto_calculated?: boolean;
            last_calculated?: string;
          } = {
            roles: data.pricing.roles || [],
            subtotal: data.pricing.subtotal,
            discount_total: data.pricing.discount_total,
            total_amount: data.pricing.total_amount,
            discount_type: data.pricing.discount_type,
            discount_amount: data.pricing.discount_amount,
            discount_percentage: data.pricing.discount_percentage,
            auto_calculated: data.pricing.auto_calculated,
            last_calculated: data.pricing.last_calculated,
          };
          
          // Save the structured pricing data
          updateData.pricing_roles = pricingData;
        }
        
        // Note: access_requirements, travel_requirements, working_hours, and testing_responsibilities columns have been removed from the schema
        break;

      case 'Content Editing':
        // Handle content editing data
        if (data.custom_intro_content !== undefined) updateData.custom_intro_content = data.custom_intro_content;
        if (data.custom_scope_content !== undefined) updateData.custom_scope_content = data.custom_scope_content;
        if (data.custom_out_of_scope_content !== undefined) updateData.custom_out_of_scope_content = data.custom_out_of_scope_content;
        if (data.custom_objectives_disclosure_content !== undefined) updateData.custom_objectives_disclosure_content = data.custom_objectives_disclosure_content;
        if (data.custom_assumptions_content !== undefined) updateData.custom_assumptions_content = data.custom_assumptions_content;
        if (data.custom_project_phases_content !== undefined) updateData.custom_project_phases_content = data.custom_project_phases_content;
        if (data.custom_roles_content !== undefined) updateData.custom_roles_content = data.custom_roles_content;
        if (data.custom_deliverables_content !== undefined) updateData.custom_deliverables_content = data.custom_deliverables_content;
        if (data.custom_objective_overview_content !== undefined) updateData.custom_objective_overview_content = data.custom_objective_overview_content;
        if (data.intro_content_edited !== undefined) updateData.intro_content_edited = data.intro_content_edited;
        if (data.scope_content_edited !== undefined) updateData.scope_content_edited = data.scope_content_edited;
        if (data.out_of_scope_content_edited !== undefined) updateData.out_of_scope_content_edited = data.out_of_scope_content_edited;
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
    console.log('🔍 About to update database with:', JSON.stringify(updateData, null, 2));
    console.log('🔍 SOW ID:', sowId);
    
    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', sowId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Database update successful:', JSON.stringify(updatedSOW, null, 2));

    // Log changes to changelog
    try {
      const session = await getServerSession(authOptions);
      await ChangelogService.compareSOWs(
        sowId,
        existingSOW,
        updatedSOW,
        session?.user?.id,
        { source: 'tab_update', tab: tab, update_type: 'tab_specific' }
      );
    } catch (changelogError) {
      console.error('❌ Error logging changes to changelog:', changelogError);
      // Don't fail the main operation if changelog logging fails
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