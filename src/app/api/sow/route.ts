import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getContentTemplate, processIntroContent, processScopeContent } from '@/lib/sow-content';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Log the incoming data for debugging
    console.log('Received data:', data);
    
    // Fetch default content templates
    let defaultIntroContent = '';
    let defaultScopeContent = '';
    let defaultObjectivesDisclosureContent = '';
    let defaultAssumptionsContent = '';
    let defaultProjectPhasesContent = '';
    
    try {
      const introTemplate = await getContentTemplate('intro');
      // Intro template loaded
      if (introTemplate) {
        // Process the intro template with the client name
        const clientName = data.header?.client_name || data.template?.customer_name || '';
        // Client name processed
        
        // If no client name is available yet, store the template with placeholder
        if (!clientName) {
          defaultIntroContent = introTemplate.default_content;
        } else {
          defaultIntroContent = processIntroContent(introTemplate.default_content, clientName);
        }
        // Intro content processed
      }
      
      const scopeTemplate = await getContentTemplate('scope');
      // Scope template loaded
      if (scopeTemplate) {
        // Process the scope template with deliverables
        const deliverables = data.scope?.deliverables ? data.scope.deliverables.split('\n').filter(Boolean) : [];
        // Deliverables processed
        defaultScopeContent = processScopeContent(scopeTemplate.default_content, deliverables);
        // Scope content processed
      }
      
      const objectivesDisclosureTemplate = await getContentTemplate('objectives-disclosure');
      // Objectives disclosure template loaded
      if (objectivesDisclosureTemplate) {
        defaultObjectivesDisclosureContent = objectivesDisclosureTemplate.default_content;
        // Objectives disclosure content processed
      }
      
      const assumptionsTemplate = await getContentTemplate('assumptions');
      // Assumptions template loaded
      if (assumptionsTemplate) {
        defaultAssumptionsContent = assumptionsTemplate.default_content;
        // Assumptions content processed
      }
      
      const projectPhasesTemplate = await getContentTemplate('project-phases');
      // Project phases template loaded
      if (projectPhasesTemplate) {
        defaultProjectPhasesContent = projectPhasesTemplate.default_content;
        // Project phases content processed
      }
    } catch (templateError) {
      console.warn('Failed to fetch content templates:', templateError);
      // Continue with empty content if templates fail to load
    }
    
    const { data: sow, error } = await supabase
      .from('sows')
      .insert({
        // Required fields
        title: data.header?.sowTitle || 'Untitled SOW',
        content: '',
        status: 'draft',
        
        // Header Information
        company_logo: data.header?.company_logo || '',
        client_name: data.header?.client_name || '',
        sow_title: data.header?.sow_title || '',
        
        // Client Signature Information
        client_title: data.client_signature?.title || '',
        client_email: data.client_signature?.email || '',
        client_signer_name: data.client_signer_name || '',
        signature_date: data.client_signature?.signature_date ? new Date(data.client_signature.signature_date).toISOString() : new Date().toISOString(),
        
        // Project Scope
        project_description: data.scope?.project_description || '',
        deliverables: data.scope?.deliverables || '',
        start_date: data.scope?.timeline?.start_date ? new Date(data.scope.timeline.start_date).toISOString() : new Date().toISOString(),
        duration: data.scope?.timeline?.duration || '',
        
        // Project Objectives
        objectives_description: data.objectives?.description || '',
        objectives_key_objectives: data.objectives?.key_objectives || [],
        avoma_transcription: data.objectives?.avoma_transcription || '',
        
        // Roles and Responsibilities
        client_roles: data.roles?.client_roles || [],
        pricing_roles: data.pricing?.roles || [],
        billing_info: data.pricing?.billing || {},
        
        // Project Assumptions
        access_requirements: data.assumptions?.access_requirements || '',
        travel_requirements: data.assumptions?.travel_requirements || '',
        working_hours: data.assumptions?.working_hours || '',
        testing_responsibilities: data.assumptions?.testing_responsibilities || '',
        
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
        
        // Copy default content templates into the SOW
        custom_intro_content: data.custom_intro_content || defaultIntroContent,
        custom_scope_content: data.custom_scope_content || defaultScopeContent,
        custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || defaultObjectivesDisclosureContent,
        custom_assumptions_content: data.custom_assumptions_content || defaultAssumptionsContent,
        custom_project_phases_content: data.custom_project_phases_content || defaultProjectPhasesContent,
        intro_content_edited: data.intro_content_edited || false,
        scope_content_edited: data.scope_content_edited || false,
        objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
        assumptions_content_edited: data.assumptions_content_edited || false,
        project_phases_content_edited: data.project_phases_content_edited || false,
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

    // SOW created successfully

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

    // Return snake_case data directly
    const transformedSows = sows.map(sow => ({
      ...sow,
      created_at: sow.created_at ? new Date(sow.created_at).toISOString() : new Date().toISOString(),
      updated_at: sow.updated_at ? new Date(sow.updated_at).toISOString() : new Date().toISOString(),
      start_date: sow.start_date && sow.start_date !== '1970-01-01T00:00:00.000Z' ? new Date(sow.start_date).toISOString() : null,
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