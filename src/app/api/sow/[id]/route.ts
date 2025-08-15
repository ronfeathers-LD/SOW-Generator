import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ChangelogService } from '@/lib/changelog-service';

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

    // Return snake_case data directly with nested structure
    const transformedSow = {
      ...sow,
      objectives: {
        description: sow.objectives_description || '',
        key_objectives: sow.objectives_key_objectives || [],
        avoma_transcription: sow.avoma_transcription || '',
        avoma_url: sow.avoma_url || '',
      },
      scope: {

        deliverables: sow.deliverables || '',
        timeline: {
          duration: sow.duration || '',
        },
      },
      template: {
        customer_name: sow.client_name || '',
        customer_signature_name: sow.client_signer_name || '',
        customer_email: sow.client_email || '',
        customer_signature: sow.client_title || '', // Add this missing mapping!
        lean_data_name: sow.leandata_name || '',
        lean_data_title: sow.leandata_title || '',
        lean_data_email: sow.leandata_email || '',
        products: productNames,
        number_of_units: sow.number_of_units || '999',
        regions: sow.regions || '999',
        salesforce_tenants: sow.salesforce_tenants || '999',
        timeline_weeks: sow.timeline_weeks || '999',
        units_consumption: sow.units_consumption || 'All units immediately',
        // BookIt Family Units
        orchestration_units: sow.orchestration_units || '',
        bookit_forms_units: sow.bookit_forms_units || '',
        bookit_links_units: sow.bookit_links_units || '',
        bookit_handoff_units: sow.bookit_handoff_units || '',
        opportunity_id: sow.opportunity_id || '',
        opportunity_name: sow.opportunity_name || '',
        opportunity_amount: sow.opportunity_amount || undefined,
        opportunity_stage: sow.opportunity_stage || '',
        opportunity_close_date: sow.opportunity_close_date || undefined,
        // Second signer information
        customer_signature_name_2: sow.customer_signature_name_2 || '',
        customer_signature_2: sow.customer_signature_2 || '',
        customer_email_2: sow.customer_email_2 || '',
        customer_signature_date_2: sow.customer_signature_date_2 || null,
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
      // Include custom content fields
      custom_intro_content: sow.custom_intro_content || null,
      custom_scope_content: sow.custom_scope_content || null,
      custom_objectives_disclosure_content: sow.custom_objectives_disclosure_content || null,
      custom_assumptions_content: sow.custom_assumptions_content || null,
      custom_project_phases_content: sow.custom_project_phases_content || null,
      custom_roles_content: sow.custom_roles_content || null,
      custom_deliverables_content: sow.custom_deliverables_content || null,
      custom_objective_overview_content: sow.custom_objective_overview_content || null,
      custom_key_objectives_content: sow.custom_key_objectives_content || null,
      intro_content_edited: sow.intro_content_edited || false,
      scope_content_edited: sow.scope_content_edited || false,
      objectives_disclosure_content_edited: sow.objectives_disclosure_content_edited || false,
      assumptions_content_edited: sow.assumptions_content_edited || false,
      project_phases_content_edited: sow.project_phases_content_edited || false,
      roles_content_edited: sow.roles_content_edited || false,
      deliverables_content_edited: sow.deliverables_content_edited || false,
      objective_overview_content_edited: sow.objective_overview_content_edited || false,
      key_objectives_content_edited: sow.key_objectives_content_edited || false,
      // Include client roles
      clientRoles: sow.client_roles || [],
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

    return NextResponse.json(transformedSow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOW' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let data: Record<string, unknown> = {};
  
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    data = await request.json();
    
    // Detect data structure
    const isNestedStructure = data.header && data.template && data.objectives;
    const isFlatStructure = data.client_name && data.sow_title;
    
    // Transform flat structure to nested if needed
    if (isFlatStructure && !isNestedStructure) {
      data = {
        header: {
          company_logo: data.company_logo || '',
          client_name: data.client_name || '',
          sow_title: data.sow_title || '',
        },
        client_signature: {
          name: data.client_signer_name || '',
          title: data.client_title || '',
          email: data.client_email || '',
          signature_date: data.signature_date || new Date().toISOString(),
        },
        client_signer_name: data.client_signer_name || '',
        scope: {
  
          deliverables: data.deliverables || '',
          timeline: {
            duration: data.duration || '',
          },
        },
        objectives: {
          description: data.objectives_description || '',
          key_objectives: data.objectives_key_objectives || [],
          avoma_transcription: data.avoma_transcription || '',
        },
        roles: {
          client_roles: data.client_roles || [],
        },
        pricing: {
          roles: data.pricing_roles || [],
          billing: data.billing_info || {},
        },
        assumptions: {
          access_requirements: data.access_requirements || '',
          travel_requirements: data.travel_requirements || '',
          working_hours: data.working_hours || '',
          testing_responsibilities: data.testing_responsibilities || '',
        },
        template: {
          customer_name: data.client_name || '',
          customer_signature_name: data.client_signer_name || '',
          customer_email: data.client_email || '',
          lean_data_name: data.leandata_name || 'Agam Vasani',
          lean_data_title: data.leandata_title || 'VP Customer Success',
          lean_data_email: data.leandata_email || 'agam.vasani@leandata.com',
          opportunity_id: data.opportunity_id || null,
          opportunity_name: data.opportunity_name || null,
          opportunity_amount: data.opportunity_amount || null,
          opportunity_stage: data.opportunity_stage || null,
          opportunity_close_date: data.opportunity_close_date || null,
        }
      };
    }
    

    
    const supabase = await createServerSupabaseClient();
    
    // Find the SOW to ensure it exists
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Build update data object with safe field access
    const updateData: Record<string, unknown> = {};
    
    // Header fields
    if (data.header) {
      const header = data.header as Record<string, unknown>;
      if (header.company_logo !== undefined) updateData.company_logo = header.company_logo;
      if (header.client_name !== undefined) updateData.client_name = header.client_name;
      if (header.sow_title !== undefined) updateData.sow_title = header.sow_title;
    }
    
    // Client signature fields
    if (data.client_signature) {
      const clientSignature = data.client_signature as Record<string, unknown>;
      if (clientSignature.title !== undefined) updateData.client_title = clientSignature.title;
      if (clientSignature.email !== undefined) updateData.client_email = clientSignature.email;
      if (clientSignature.signature_date !== undefined) updateData.signature_date = new Date(clientSignature.signature_date as string).toISOString();
    }
    
    if (data.client_signer_name !== undefined) updateData.client_signer_name = data.client_signer_name || '';
    
    // Scope fields
    if (data.scope) {
      const scope = data.scope as Record<string, unknown>;
      if (scope.deliverables !== undefined) updateData.deliverables = scope.deliverables;
      if ((scope.timeline as Record<string, unknown>)?.start_date !== undefined) updateData.start_date = new Date((scope.timeline as Record<string, unknown>).start_date as string).toISOString();
      if ((scope.timeline as Record<string, unknown>)?.duration !== undefined) updateData.duration = (scope.timeline as Record<string, unknown>).duration;
    }
    
    // Objectives fields
    // API received objectives data
    if (data.objectives) {
      const objectives = data.objectives as Record<string, unknown>;
      if (objectives.description !== undefined) {
        updateData.objectives_description = objectives.description;
        // Setting objectives_description
      }
      if (objectives.key_objectives !== undefined) {
        updateData.objectives_key_objectives = objectives.key_objectives;
        // Setting objectives_key_objectives
      }
      if (objectives.avoma_transcription !== undefined) {
        updateData.avoma_transcription = objectives.avoma_transcription;
        // Setting avoma_transcription
      }
      if (objectives.avoma_url !== undefined) {
        updateData.avoma_url = objectives.avoma_url;
        // Setting avoma_url
      }
    }
    
    // Roles fields
    if (data.roles) {
      const roles = data.roles as Record<string, unknown>;
      if (roles.client_roles !== undefined) updateData.client_roles = roles.client_roles;
    }
    if (data.pricing) {
      const pricing = data.pricing as Record<string, unknown>;
      if (pricing.roles !== undefined) updateData.pricing_roles = pricing.roles;
      if (pricing.billing !== undefined) updateData.billing_info = pricing.billing;
    }
    
    // Assumptions fields
    if (data.assumptions) {
      const assumptions = data.assumptions as Record<string, unknown>;
      if (assumptions.access_requirements !== undefined) updateData.access_requirements = assumptions.access_requirements;
      if (assumptions.travel_requirements !== undefined) updateData.travel_requirements = assumptions.travel_requirements;
      if (assumptions.working_hours !== undefined) updateData.working_hours = assumptions.working_hours;
      if (assumptions.testing_responsibilities !== undefined) updateData.testing_responsibilities = assumptions.testing_responsibilities;
    }
    

    
    // LeanData Information
    if (data.template) {
      const template = data.template as Record<string, unknown>;
      if (template.lean_data_name !== undefined) updateData.leandata_name = template.lean_data_name;
      if (template.lean_data_title !== undefined) updateData.leandata_title = template.lean_data_title;
      if (template.lean_data_email !== undefined) updateData.leandata_email = template.lean_data_email;
    }
    

    
    // Project Details Information
    if (data.template) {
      const template = data.template as Record<string, unknown>;
      if (template.number_of_units !== undefined) updateData.number_of_units = template.number_of_units;
      if (template.regions !== undefined) updateData.regions = template.regions;
      if (template.salesforce_tenants !== undefined) updateData.salesforce_tenants = template.salesforce_tenants;
      if (template.timeline_weeks !== undefined) updateData.timeline_weeks = template.timeline_weeks;
      if (template.start_date !== undefined) updateData.project_start_date = template.start_date ? new Date(template.start_date as string).toISOString() : null;
      if (template.end_date !== undefined) updateData.project_end_date = template.end_date ? new Date(template.end_date as string).toISOString() : null;
      if (template.units_consumption !== undefined) updateData.units_consumption = template.units_consumption;
    }

    // Salesforce Opportunity Information
    if (data.template) {
      const template = data.template as Record<string, unknown>;
      if (template.opportunity_id !== undefined) updateData.opportunity_id = template.opportunity_id || null;
      if (template.opportunity_name !== undefined) updateData.opportunity_name = template.opportunity_name || null;
      if (template.opportunity_amount !== undefined) updateData.opportunity_amount = template.opportunity_amount || null;
      if (template.opportunity_stage !== undefined) updateData.opportunity_stage = template.opportunity_stage || null;
      if (template.opportunity_close_date !== undefined) updateData.opportunity_close_date = template.opportunity_close_date ? new Date(template.opportunity_close_date as string).toISOString() : null;
    }

    // Custom Content fields
    if (data.custom_intro_content !== undefined) updateData.custom_intro_content = data.custom_intro_content;
    if (data.custom_scope_content !== undefined) updateData.custom_scope_content = data.custom_scope_content;
    if (data.custom_objectives_disclosure_content !== undefined) updateData.custom_objectives_disclosure_content = data.custom_objectives_disclosure_content;
    if (data.custom_assumptions_content !== undefined) updateData.custom_assumptions_content = data.custom_assumptions_content;
    if (data.custom_project_phases_content !== undefined) updateData.custom_project_phases_content = data.custom_project_phases_content;
    if (data.intro_content_edited !== undefined) updateData.intro_content_edited = data.intro_content_edited;
    if (data.scope_content_edited !== undefined) updateData.scope_content_edited = data.scope_content_edited;
    if (data.objectives_disclosure_content_edited !== undefined) updateData.objectives_disclosure_content_edited = data.objectives_disclosure_content_edited;
    if (data.assumptions_content_edited !== undefined) updateData.assumptions_content_edited = data.assumptions_content_edited;
    if (data.project_phases_content_edited !== undefined) updateData.project_phases_content_edited = data.project_phases_content_edited;


    
    // Update the SOW
    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', (await params).id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      console.error('Update data that failed:', updateData);
      return NextResponse.json(
        { error: 'Failed to update SOW', details: updateError.message },
        { status: 500 }
      );
    }

    // Handle products if provided - use JSONB field
    if (data.template) {
      const template = data.template as Record<string, unknown>;
      if (template.products !== undefined) {
        updateData.products = template.products;
      }
    }

    // Log changes to changelog
    try {
      await ChangelogService.compareSOWs(
        (await params).id,
        existingSOW,
        updatedSOW,
        session?.user?.id,
        { source: 'main_update', update_type: 'comprehensive' }
      );
    } catch (changelogError) {
      console.error('Error logging changes to changelog:', changelogError);
      // Don't fail the main operation if changelog logging fails
    }

    // Updated SOW response
    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW:', error, { body: data || 'No data' });
    return NextResponse.json(
      { error: 'Failed to update SOW' },
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