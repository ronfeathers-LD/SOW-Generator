import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: sow, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error || !sow) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Return snake_case data directly with nested structure
    const transformedSow = {
      ...sow,
      objectives: {
        description: sow.objectives_description || '',
        key_objectives: sow.objectives_key_objectives || [],
        avoma_transcription: sow.avoma_transcription || '',
      },
      scope: {
        project_description: sow.project_description || '',
        deliverables: sow.deliverables || '',
        timeline: {
          start_date: sow.start_date ? new Date(sow.start_date) : new Date(),
          duration: sow.duration || '',
        },
      },
      template: {
        customer_name: sow.client_name || '',
        customer_signature_name: sow.client_signer_name || '',
        customer_email: sow.client_email || '',
        lean_data_name: sow.leandata_name || '',
        lean_data_title: sow.leandata_title || '',
        lean_data_email: sow.leandata_email || '',
        opportunity_id: sow.opportunity_id || '',
        opportunity_name: sow.opportunity_name || '',
        opportunity_amount: sow.opportunity_amount || undefined,
        opportunity_stage: sow.opportunity_stage || '',
        opportunity_close_date: sow.opportunity_close_date || undefined,
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
  let data;
  try {
    data = await request.json();
    
    // Detect data structure and log it
    const isNestedStructure = data.header && data.template && data.objectives;
    const isFlatStructure = data.client_name && data.sow_title;
    
    console.log('🔍 Data structure detection:', {
      isNestedStructure,
      isFlatStructure,
      hasHeader: !!data.header,
      hasTemplate: !!data.template,
      hasClientName: !!data.client_name,
      hasSowTitle: !!data.sow_title,
      sampleData: {
        nested: { header: data.header?.clientName, template: data.template?.customerName },
        flat: { client_name: data.client_name, sow_title: data.sow_title }
      }
    });
    
    // Transform flat structure to nested if needed
    if (isFlatStructure && !isNestedStructure) {
      console.log('⚠️  Converting flat structure to nested structure');
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
          project_description: data.project_description || '',
          deliverables: data.deliverables || '',
          timeline: {
            start_date: data.start_date || new Date().toISOString(),
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
        addendums: data.addendums || [],
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
    
    // Debug logging for final structure
    console.log('API received data (after transformation):', {
      client_name: data.header?.client_name,
      client_signer_name: data.client_signer_name,
      client_signature: data.client_signature,
      lean_data_signator: {
        lean_data_name: data.template?.lean_data_name,
        lean_data_title: data.template?.lean_data_title,
        lean_data_email: data.template?.lean_data_email,
      },
      template: data.template
    });
    
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
    const updateData: any = {};
    
    // Header fields
    if (data.header) {
      if (data.header.company_logo !== undefined) updateData.company_logo = data.header.company_logo;
      if (data.header.client_name !== undefined) updateData.client_name = data.header.client_name;
      if (data.header.sow_title !== undefined) updateData.sow_title = data.header.sow_title;
    }
    
    // Client signature fields
    if (data.client_signature) {
      if (data.client_signature.title !== undefined) updateData.client_title = data.client_signature.title;
      if (data.client_signature.email !== undefined) updateData.client_email = data.client_signature.email;
      if (data.client_signature.signature_date !== undefined) updateData.signature_date = new Date(data.client_signature.signature_date).toISOString();
    }
    
    if (data.client_signer_name !== undefined) updateData.client_signer_name = data.client_signer_name || '';
    
    // Scope fields
    if (data.scope) {
      if (data.scope.project_description !== undefined) updateData.project_description = data.scope.project_description;
      if (data.scope.deliverables !== undefined) updateData.deliverables = data.scope.deliverables;
      if (data.scope.timeline?.start_date !== undefined) updateData.start_date = new Date(data.scope.timeline.start_date).toISOString();
      if (data.scope.timeline?.duration !== undefined) updateData.duration = data.scope.timeline.duration;
    }
    
    // Objectives fields
    if (data.objectives) {
      if (data.objectives.description !== undefined) updateData.objectives_description = data.objectives.description;
      if (data.objectives.key_objectives !== undefined) updateData.objectives_key_objectives = data.objectives.key_objectives;
      if (data.objectives.avoma_transcription !== undefined) updateData.avoma_transcription = data.objectives.avoma_transcription;
    }
    
    // Roles fields
    if (data.roles?.client_roles !== undefined) updateData.client_roles = data.roles.client_roles;
    if (data.pricing?.roles !== undefined) updateData.pricing_roles = data.pricing.roles;
    if (data.pricing?.billing !== undefined) updateData.billing_info = data.pricing.billing;
    
    // Assumptions fields
    if (data.assumptions) {
      if (data.assumptions.access_requirements !== undefined) updateData.access_requirements = data.assumptions.access_requirements;
      if (data.assumptions.travel_requirements !== undefined) updateData.travel_requirements = data.assumptions.travel_requirements;
      if (data.assumptions.working_hours !== undefined) updateData.working_hours = data.assumptions.working_hours;
      if (data.assumptions.testing_responsibilities !== undefined) updateData.testing_responsibilities = data.assumptions.testing_responsibilities;
    }
    
    if (data.addendums !== undefined) updateData.addendums = data.addendums;
    
    // LeanData Information
    if (data.template) {
      if (data.template.lean_data_name !== undefined) updateData.leandata_name = data.template.lean_data_name;
      if (data.template.lean_data_title !== undefined) updateData.leandata_title = data.template.lean_data_title;
      if (data.template.lean_data_email !== undefined) updateData.leandata_email = data.template.lean_data_email;
    }
    
    // Debug logging for LeanData signator update
    console.log('LeanData signator update data:', {
      lean_data_name: updateData.leandata_name,
      lean_data_title: updateData.leandata_title,
      lean_data_email: updateData.leandata_email,
    });
    
    // Salesforce Opportunity Information
    if (data.template) {
      if (data.template.opportunity_id !== undefined) updateData.opportunity_id = data.template.opportunity_id || null;
      if (data.template.opportunity_name !== undefined) updateData.opportunity_name = data.template.opportunity_name || null;
      if (data.template.opportunity_amount !== undefined) updateData.opportunity_amount = data.template.opportunity_amount || null;
      if (data.template.opportunity_stage !== undefined) updateData.opportunity_stage = data.template.opportunity_stage || null;
      if (data.template.opportunity_close_date !== undefined) updateData.opportunity_close_date = data.template.opportunity_close_date ? new Date(data.template.opportunity_close_date).toISOString() : null;
    }

    // Debug logging for update data
    console.log('Updating SOW with data:', updateData);
    
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

    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW:', error, { body: data });
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
    const { id } = await params;
    
    // Find the SOW to ensure it exists
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Delete all comments first (they reference the SOW)
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('sow_id', id);

    if (commentsError) {
      console.error('Error deleting comments:', commentsError);
    }

    // Delete all versions of this SOW
    const { error: versionsError } = await supabase
      .from('sows')
      .delete()
      .eq('parent_id', id);

    if (versionsError) {
      console.error('Error deleting versions:', versionsError);
    }

    // Finally delete the main SOW
    const { error: deleteError } = await supabase
      .from('sows')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting SOW:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete SOW' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'SOW deleted successfully' });
  } catch (error) {
    console.error('Error deleting SOW:', error);
    return NextResponse.json(
      { error: 'Failed to delete SOW' },
      { status: 500 }
    );
  }
} 