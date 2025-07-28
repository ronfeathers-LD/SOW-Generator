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

    return NextResponse.json(sow);
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
    
    // Debug logging
    console.log('API received data:', {
      clientName: data.header?.clientName,
      clientSignerName: data.clientSignerName,
      clientSignature: data.clientSignature,
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
    
    // Salesforce Opportunity Information
    if (data.template) {
      if (data.template.opportunityId !== undefined) updateData.opportunity_id = data.template.opportunityId || null;
      if (data.template.opportunityName !== undefined) updateData.opportunity_name = data.template.opportunityName || null;
      if (data.template.opportunityAmount !== undefined) updateData.opportunity_amount = data.template.opportunityAmount || null;
      if (data.template.opportunityStage !== undefined) updateData.opportunity_stage = data.template.opportunityStage || null;
      if (data.template.opportunityCloseDate !== undefined) updateData.opportunity_close_date = data.template.opportunityCloseDate ? new Date(data.template.opportunityCloseDate).toISOString() : null;
    }

    // Update the SOW
    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', (await params).id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW' },
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