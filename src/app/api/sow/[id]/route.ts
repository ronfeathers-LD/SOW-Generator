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

    // Fetch products for this SOW
    const { data: sowProducts, error: productsError } = await supabase
      .from('sow_products')
      .select(`
        product_id,
        products (
          name
        )
      `)
      .eq('sow_id', sow.id);

    const productNames = sowProducts?.map(sp => (sp.products as any)?.name).filter(Boolean) || ['Matching/Routing'];

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
        products: productNames,
        number_of_units: sow.number_of_units || '125',
        regions: sow.regions || '1',
        salesforce_tenants: sow.salesforce_tenants || '2',
        timeline_weeks: sow.timeline_weeks || '8',
        start_date: sow.project_start_date ? new Date(sow.project_start_date) : null,
        end_date: sow.project_end_date ? new Date(sow.project_end_date) : null,
        units_consumption: sow.units_consumption || 'All units immediately',
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
      // Include custom content fields
      custom_intro_content: sow.custom_intro_content || null,
      custom_scope_content: sow.custom_scope_content || null,
      custom_objectives_disclosure_content: sow.custom_objectives_disclosure_content || null,
      intro_content_edited: sow.intro_content_edited || false,
      scope_content_edited: sow.scope_content_edited || false,
      objectives_disclosure_content_edited: sow.objectives_disclosure_content_edited || false,
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
    console.log('🔍 API received objectives data:', data.objectives);
    if (data.objectives) {
      if (data.objectives.description !== undefined) {
        updateData.objectives_description = data.objectives.description;
        console.log('🔍 Setting objectives_description:', data.objectives.description);
      }
      if (data.objectives.key_objectives !== undefined) {
        updateData.objectives_key_objectives = data.objectives.key_objectives;
        console.log('🔍 Setting objectives_key_objectives:', data.objectives.key_objectives);
      }
      if (data.objectives.avoma_transcription !== undefined) {
        updateData.avoma_transcription = data.objectives.avoma_transcription;
        console.log('🔍 Setting avoma_transcription:', data.objectives.avoma_transcription);
      }
      if (data.objectives.avoma_url !== undefined) {
        updateData.avoma_url = data.objectives.avoma_url;
        console.log('🔍 Setting avoma_url:', data.objectives.avoma_url);
      }
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
    

    
    // Project Details Information
    if (data.template) {
      if (data.template.number_of_units !== undefined) updateData.number_of_units = data.template.number_of_units;
      if (data.template.regions !== undefined) updateData.regions = data.template.regions;
      if (data.template.salesforce_tenants !== undefined) updateData.salesforce_tenants = data.template.salesforce_tenants;
      if (data.template.timeline_weeks !== undefined) updateData.timeline_weeks = data.template.timeline_weeks;
      if (data.template.start_date !== undefined) updateData.project_start_date = data.template.start_date ? new Date(data.template.start_date).toISOString() : null;
      if (data.template.end_date !== undefined) updateData.project_end_date = data.template.end_date ? new Date(data.template.end_date).toISOString() : null;
      if (data.template.units_consumption !== undefined) updateData.units_consumption = data.template.units_consumption;
    }

    // Salesforce Opportunity Information
    if (data.template) {
      if (data.template.opportunity_id !== undefined) updateData.opportunity_id = data.template.opportunity_id || null;
      if (data.template.opportunity_name !== undefined) updateData.opportunity_name = data.template.opportunity_name || null;
      if (data.template.opportunity_amount !== undefined) updateData.opportunity_amount = data.template.opportunity_amount || null;
      if (data.template.opportunity_stage !== undefined) updateData.opportunity_stage = data.template.opportunity_stage || null;
      if (data.template.opportunity_close_date !== undefined) updateData.opportunity_close_date = data.template.opportunity_close_date ? new Date(data.template.opportunity_close_date).toISOString() : null;
    }

    // Custom Content fields
    if (data.custom_intro_content !== undefined) updateData.custom_intro_content = data.custom_intro_content;
    if (data.custom_scope_content !== undefined) updateData.custom_scope_content = data.custom_scope_content;
    if (data.custom_objectives_disclosure_content !== undefined) updateData.custom_objectives_disclosure_content = data.custom_objectives_disclosure_content;
    if (data.intro_content_edited !== undefined) updateData.intro_content_edited = data.intro_content_edited;
    if (data.scope_content_edited !== undefined) updateData.scope_content_edited = data.scope_content_edited;
    if (data.objectives_disclosure_content_edited !== undefined) updateData.objectives_disclosure_content_edited = data.objectives_disclosure_content_edited;


    
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

    // Handle products if provided
    if (data.template?.products !== undefined) {
      const sowId = (await params).id;
      
      console.log('🔍 Processing products:', data.template.products);
      
      // Delete existing product associations
      const { error: deleteError } = await supabase
        .from('sow_products')
        .delete()
        .eq('sow_id', sowId);

      if (deleteError) {
        console.error('Error deleting existing products:', deleteError);
      }

      // Get product IDs for the provided product names
      if (data.template.products.length > 0) {
        const { data: productIds, error: productError } = await supabase
          .from('products')
          .select('id, name')
          .in('name', data.template.products);

        if (productError) {
          console.error('Error fetching product IDs:', productError);
          console.error('Requested product names:', data.template.products);
        } else {
          console.log('🔍 Found product IDs:', productIds);
          
          if (productIds && productIds.length > 0) {
            // Insert new product associations
            const sowProductData = productIds.map(product => ({
              sow_id: sowId,
              product_id: product.id
            }));

            const { error: insertError } = await supabase
              .from('sow_products')
              .insert(sowProductData);

            if (insertError) {
              console.error('Error inserting product associations:', insertError);
            } else {
              console.log('🔍 Successfully inserted product associations');
            }
          } else {
            console.warn('🔍 No product IDs found for names:', data.template.products);
          }
        }
      }
    }

    console.log('🔍 Updated SOW response:', updatedSOW);
    console.log('🔍 Updated SOW avoma_url:', updatedSOW.avoma_url);

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