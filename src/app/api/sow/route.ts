import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ChangelogService } from '@/lib/changelog-service';
import { supabaseApi } from '@/lib/supabase-api';
import { getSlackService } from '@/lib/slack';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch content templates directly from database
    const { data: templates, error: templateError } = await supabaseApi
      .from('sow_content_templates')
      .select('*')
      .eq('is_active', true);
    
    if (templateError) {
      console.error('Error fetching content templates:', templateError);
    }
    
    // Extract default content from templates
    const templateMap = new Map();
    if (templates) {
      templates.forEach(template => {
        templateMap.set(template.section_name, template.default_content);
      });
    }
    
    const defaultIntroContent = templateMap.get('intro') || '';
    const defaultScopeContent = templateMap.get('scope') || '';
    const defaultObjectivesDisclosureContent = templateMap.get('objectives-disclosure') || '';
    const defaultAssumptionsContent = templateMap.get('assumptions') || '';
    const defaultProjectPhasesContent = templateMap.get('project-phases') || '';
    const defaultRolesContent = templateMap.get('roles') || '';
    const { data: sow, error } = await supabaseApi
      .from('sows')
      .insert({
        // Required fields
        title: data.header?.sowTitle || 'Untitled SOW',
        status: 'draft',
        
        // Header Information
        company_logo: data.header?.company_logo || '',
        client_name: data.template?.customer_name || data.header?.client_name || '',
        
        // Client Signature Information
        client_title: data.client_signature?.title || '',
        client_email: data.client_signature?.email || '',
        client_signer_name: data.client_signer_name || '',
        signature_date: data.client_signature?.signature_date ? new Date(data.client_signature.signature_date).toISOString() : new Date().toISOString(),
        
        // Project Scope
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
        // Note: access_requirements, travel_requirements, working_hours, testing_responsibilities columns have been removed
        
        // LeanData Information
        leandata_name: data.template?.lean_data_name || 'Agam Vasani',
        leandata_title: data.template?.lean_data_title || 'VP Customer Success',
        leandata_email: data.template?.lean_data_email || 'agam.vasani@leandata.com',
        
        // Salesforce Account Information
        salesforce_account_id: data.selectedAccount?.id || null,
        
        // Author tracking
        author_id: user.id,
        
        // Salesforce Opportunity Information
        opportunity_id: data.template?.opportunity_id || null,
        opportunity_name: data.template?.opportunity_name || null,
        opportunity_amount: data.template?.opportunity_amount || null,
        opportunity_stage: data.template?.opportunity_stage || null,
        opportunity_close_date: data.template?.opportunity_close_date ? new Date(data.template.opportunity_close_date).toISOString() : null,
        
        // Project Details
        products: data.template?.products || [],
        number_of_units: data.template?.number_of_units || '',
        regions: data.template?.regions || '',
        salesforce_tenants: data.template?.salesforce_tenants || '',
        timeline_weeks: data.template?.timeline_weeks || '',
        units_consumption: data.template?.units_consumption || '',
        
        // BookIt Family Units
        orchestration_units: data.template?.number_of_units || '',
        bookit_forms_units: data.template?.bookit_forms_units || '',
        bookit_links_units: data.template?.bookit_links_units || '',
        bookit_handoff_units: data.template?.bookit_handoff_units || '',
        
        // Template data
        template: data.template || {},
        
        // Copy default content templates into the SOW
        custom_intro_content: data.custom_intro_content || defaultIntroContent,
        custom_scope_content: data.custom_scope_content || defaultScopeContent,
        custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || defaultObjectivesDisclosureContent,
        custom_assumptions_content: data.custom_assumptions_content || defaultAssumptionsContent,
        custom_project_phases_content: data.custom_project_phases_content || defaultProjectPhasesContent,
        custom_roles_content: data.custom_roles_content || defaultRolesContent,
        custom_deliverables_content: data.custom_deliverables_content || '',
        custom_objective_overview_content: data.custom_objective_overview_content || '',
        custom_key_objectives_content: data.custom_key_objectives_content || '',
        intro_content_edited: data.intro_content_edited || false,
        scope_content_edited: data.scope_content_edited || false,
        objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
        assumptions_content_edited: data.assumptions_content_edited || false,
        project_phases_content_edited: data.project_phases_content_edited || false,
        roles_content_edited: data.roles_content_edited || false,
        deliverables_content_edited: data.deliverables_content_edited || false,
        objective_overview_content_edited: data.objective_overview_content_edited || false,
        key_objectives_content_edited: data.key_objectives_content_edited || false,
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



    // Log SOW creation to changelog
    try {
      await ChangelogService.logSOWCreation(sow.id, user.id, {
        source: 'sow_creation',
        template_data: !!data.template,
        has_salesforce_data: !!data.selectedAccount
      });
    } catch (changelogError) {
      console.error('Error logging SOW creation to changelog:', changelogError);
      // Don't fail the main operation if changelog logging fails
    }

    // SOW created successfully
    console.log('✅ SOW created successfully:', sow.id);

    // Send Slack notification for new SOW creation
    try {
      const slackService = getSlackService();
      if (slackService) {
        const sowTitle = sow.sow_title || 'Untitled SOW';
        const clientName = sow.client_name || 'Unknown Client';
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const sowUrl = `${baseUrl}/sow/${sow.id}`;

        await slackService.sendMessage(
          `:new: *New SOW Created*\n\n` +
          `*Client:* ${clientName}\n` +
          `*Created by:* ${session.user.email}\n\n` +
          `:link: <${sowUrl}|View SOW>\n\n` +
          `This SOW is now in draft status and ready for completion.`
        );
      }
    } catch (slackError) {
      console.error('Slack notification failed for SOW creation:', slackError);
      // Don't fail the main operation if Slack notification fails
    }

    return NextResponse.json(sow);
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
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sows, error } = await supabaseApi
      .from('sows')
      .select(`
        *,
        author:users(name)
      `)
      .eq('is_hidden', false) // Only show non-hidden SOWs
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
      author: sow.author?.name || 'Unknown',
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