import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Log the incoming data for debugging
    console.log('Received data:', data);
    
    const { data: sow, error } = await supabase
      .from('sows')
      .insert({
        // Required fields
        title: data.header?.sowTitle || 'Untitled SOW',
        content: '',
        status: 'draft',
        
        // Header Information
        company_logo: data.header?.companyLogo || '',
        client_name: data.header?.clientName || '',
        sow_title: data.header?.sowTitle || '',
        
        // Client Signature Information
        client_title: data.clientSignature?.title || '',
        client_email: data.clientSignature?.email || '',
        client_signer_name: data.clientSignerName || '',
        signature_date: data.clientSignature?.signatureDate ? new Date(data.clientSignature.signatureDate).toISOString() : new Date().toISOString(),
        
        // Project Scope
        project_description: data.scope?.projectDescription || '',
        deliverables: data.scope?.deliverables || '',
        start_date: data.scope?.timeline?.startDate ? new Date(data.scope.timeline.startDate).toISOString() : new Date().toISOString(),
        duration: data.scope?.timeline?.duration || '',
        
        // Project Objectives
        objectives_description: data.objectives?.description || '',
        objectives_key_objectives: data.objectives?.keyObjectives || [],
        avoma_transcription: data.objectives?.avomaTranscription || '',
        
        // Roles and Responsibilities
        client_roles: data.roles?.clientRoles || [],
        pricing_roles: data.pricing?.roles || [],
        billing_info: data.pricing?.billing || {},
        
        // Project Assumptions
        access_requirements: data.assumptions?.accessRequirements || '',
        travel_requirements: data.assumptions?.travelRequirements || '',
        working_hours: data.assumptions?.workingHours || '',
        testing_responsibilities: data.assumptions?.testingResponsibilities || '',
        
        // Addendums
        addendums: data.addendums || [],
        
        // LeanData Information
        leandata_name: data.template?.leanDataName || 'Agam Vasani',
        leandata_title: data.template?.leanDataTitle || 'VP Customer Success',
        leandata_email: data.template?.leanDataEmail || 'agam.vasani@leandata.com',
        
        // Salesforce Opportunity Information
        opportunity_id: data.template?.opportunityId || null,
        opportunity_name: data.template?.opportunityName || null,
        opportunity_amount: data.template?.opportunityAmount || null,
        opportunity_stage: data.template?.opportunityStage || null,
        opportunity_close_date: data.template?.opportunityCloseDate ? new Date(data.template.opportunityCloseDate).toISOString() : null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to save SOW',
          error: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'SOW saved successfully',
      id: sow.id,
      data: sow 
    });
  } catch (error) {
    console.error('Error saving SOW:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save SOW',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data: sows, error } = await supabase
      .from('sows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch SOWs' },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformedSows = sows.map(sow => ({
      id: sow.id,
      clientName: sow.client_name || '',
      sowTitle: sow.sow_title || '',
      startDate: sow.start_date ? new Date(sow.start_date) : new Date(),
      endDate: sow.start_date ? new Date(sow.start_date) : new Date(), // Use start_date as fallback since no end_date field
      status: sow.status || 'draft',
      createdAt: sow.created_at ? new Date(sow.created_at) : new Date(),
      updatedAt: sow.updated_at ? new Date(sow.updated_at) : new Date(),
    }));

    return NextResponse.json(transformedSows);
  } catch (error) {
    console.error('Error fetching SOWs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOWs' },
      { status: 500 }
    );
  }
} 