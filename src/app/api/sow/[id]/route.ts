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

    // Transform the data to match the frontend structure
    const transformedSow = {
      ...sow,
      objectives: {
        description: sow.objectives_description || '',
        keyObjectives: sow.objectives_key_objectives || [],
        avomaTranscription: sow.avoma_transcription || '',
      },
      scope: {
        projectDescription: sow.project_description || '',
        deliverables: sow.deliverables || '',
        timeline: {
          startDate: sow.start_date ? new Date(sow.start_date) : new Date(),
          duration: sow.duration || '',
        },
      },
      template: {
        customerName: sow.client_name || '',
        customerSignatureName: sow.client_signer_name || '',
        customerEmail: sow.client_email || '',
        leanDataName: sow.leandata_name || '',
        leanDataTitle: sow.leandata_title || '',
        leanDataEmail: sow.leandata_email || '',
        opportunityId: sow.opportunity_id || '',
        opportunityName: sow.opportunity_name || '',
        opportunityAmount: sow.opportunity_amount || undefined,
        opportunityStage: sow.opportunity_stage || '',
        opportunityCloseDate: sow.opportunity_close_date || undefined,
      },
      header: {
        companyLogo: sow.company_logo || '',
        clientName: sow.client_name || '',
        sowTitle: sow.sow_title || '',
      },
      clientSignature: {
        name: sow.client_signer_name || '',
        title: sow.client_title || '',
        email: sow.client_email || '',
        signatureDate: sow.signature_date ? new Date(sow.signature_date) : new Date(),
      },
      clientSignerName: sow.client_signer_name || '',
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
          companyLogo: data.company_logo || '',
          clientName: data.client_name || '',
          sowTitle: data.sow_title || '',
        },
        clientSignature: {
          name: data.client_signer_name || '',
          title: data.client_title || '',
          email: data.client_email || '',
          signatureDate: data.signature_date || new Date().toISOString(),
        },
        clientSignerName: data.client_signer_name || '',
        scope: {
          projectDescription: data.project_description || '',
          deliverables: data.deliverables || '',
          timeline: {
            startDate: data.start_date || new Date().toISOString(),
            duration: data.duration || '',
          },
        },
        objectives: {
          description: data.objectives_description || '',
          keyObjectives: data.objectives_key_objectives || [],
          avomaTranscription: data.avoma_transcription || '',
        },
        roles: {
          clientRoles: data.client_roles || [],
        },
        pricing: {
          roles: data.pricing_roles || [],
          billing: data.billing_info || {},
        },
        assumptions: {
          accessRequirements: data.access_requirements || '',
          travelRequirements: data.travel_requirements || '',
          workingHours: data.working_hours || '',
          testingResponsibilities: data.testing_responsibilities || '',
        },
        addendums: data.addendums || [],
        template: {
          customerName: data.client_name || '',
          customerSignatureName: data.client_signer_name || '',
          customerEmail: data.client_email || '',
          leanDataName: data.leandata_name || 'Agam Vasani',
          leanDataTitle: data.leandata_title || 'VP Customer Success',
          leanDataEmail: data.leandata_email || 'agam.vasani@leandata.com',
          opportunityId: data.opportunity_id || null,
          opportunityName: data.opportunity_name || null,
          opportunityAmount: data.opportunity_amount || null,
          opportunityStage: data.opportunity_stage || null,
          opportunityCloseDate: data.opportunity_close_date || null,
        }
      };
    }
    
    // Debug logging for final structure
    console.log('API received data (after transformation):', {
      clientName: data.header?.clientName,
      clientSignerName: data.clientSignerName,
      clientSignature: data.clientSignature,
      leanDataSignator: {
        leanDataName: data.template?.leanDataName,
        leanDataTitle: data.template?.leanDataTitle,
        leanDataEmail: data.template?.leanDataEmail,
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
      if (data.header.companyLogo !== undefined) updateData.company_logo = data.header.companyLogo;
      if (data.header.clientName !== undefined) updateData.client_name = data.header.clientName;
      if (data.header.sowTitle !== undefined) updateData.sow_title = data.header.sowTitle;
    }
    
    // Client signature fields
    if (data.clientSignature) {
      if (data.clientSignature.title !== undefined) updateData.client_title = data.clientSignature.title;
      if (data.clientSignature.email !== undefined) updateData.client_email = data.clientSignature.email;
      if (data.clientSignature.signatureDate !== undefined) updateData.signature_date = new Date(data.clientSignature.signatureDate).toISOString();
    }
    
    if (data.clientSignerName !== undefined) updateData.client_signer_name = data.clientSignerName || '';
    
    // Scope fields
    if (data.scope) {
      if (data.scope.projectDescription !== undefined) updateData.project_description = data.scope.projectDescription;
      if (data.scope.deliverables !== undefined) updateData.deliverables = data.scope.deliverables;
      if (data.scope.timeline?.startDate !== undefined) updateData.start_date = new Date(data.scope.timeline.startDate).toISOString();
      if (data.scope.timeline?.duration !== undefined) updateData.duration = data.scope.timeline.duration;
    }
    
    // Objectives fields
    if (data.objectives) {
      if (data.objectives.description !== undefined) updateData.objectives_description = data.objectives.description;
      if (data.objectives.keyObjectives !== undefined) updateData.objectives_key_objectives = data.objectives.keyObjectives;
      if (data.objectives.avomaTranscription !== undefined) updateData.avoma_transcription = data.objectives.avomaTranscription;
    }
    
    // Roles fields
    if (data.roles?.clientRoles !== undefined) updateData.client_roles = data.roles.clientRoles;
    if (data.pricing?.roles !== undefined) updateData.pricing_roles = data.pricing.roles;
    if (data.pricing?.billing !== undefined) updateData.billing_info = data.pricing.billing;
    
    // Assumptions fields
    if (data.assumptions) {
      if (data.assumptions.accessRequirements !== undefined) updateData.access_requirements = data.assumptions.accessRequirements;
      if (data.assumptions.travelRequirements !== undefined) updateData.travel_requirements = data.assumptions.travelRequirements;
      if (data.assumptions.workingHours !== undefined) updateData.working_hours = data.assumptions.workingHours;
      if (data.assumptions.testingResponsibilities !== undefined) updateData.testing_responsibilities = data.assumptions.testingResponsibilities;
    }
    
    if (data.addendums !== undefined) updateData.addendums = data.addendums;
    
    // LeanData Information
    if (data.template) {
      if (data.template.leanDataName !== undefined) updateData.leandata_name = data.template.leanDataName;
      if (data.template.leanDataTitle !== undefined) updateData.leandata_title = data.template.leanDataTitle;
      if (data.template.leanDataEmail !== undefined) updateData.leandata_email = data.template.leanDataEmail;
    }
    
    // Debug logging for LeanData signator update
    console.log('LeanData signator update data:', {
      leanDataName: updateData.leandata_name,
      leanDataTitle: updateData.leandata_title,
      leanDataEmail: updateData.leandata_email,
    });
    
    // Salesforce Opportunity Information
    if (data.template) {
      if (data.template.opportunityId !== undefined) updateData.opportunity_id = data.template.opportunityId || null;
      if (data.template.opportunityName !== undefined) updateData.opportunity_name = data.template.opportunityName || null;
      if (data.template.opportunityAmount !== undefined) updateData.opportunity_amount = data.template.opportunityAmount || null;
      if (data.template.opportunityStage !== undefined) updateData.opportunity_stage = data.template.opportunityStage || null;
      if (data.template.opportunityCloseDate !== undefined) updateData.opportunity_close_date = data.template.opportunityCloseDate ? new Date(data.template.opportunityCloseDate).toISOString() : null;
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