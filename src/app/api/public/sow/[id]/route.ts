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
      return new NextResponse('SOW not found', { status: 404 });
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

    const productNames = sowProducts?.map(sp => (sp.products as any)?.name).filter(Boolean) || [];

    // Return transformed data with template structure
    const transformedSow = {
      ...sow,
      template: {
        customer_name: sow.client_name || '',
        customer_signature_name: sow.client_signer_name || '',
        customer_email: sow.client_email || '',
        lean_data_name: sow.leandata_name || '',
        lean_data_title: sow.leandata_title || '',
        lean_data_email: sow.leandata_email || '',
        products: productNames,
        number_of_units: sow.number_of_units || '',
        regions: sow.regions || '',
        salesforce_tenants: sow.salesforce_tenants || '',
        timeline_weeks: sow.timeline_weeks || '',
        units_consumption: sow.units_consumption || '',
        opportunity_id: sow.opportunity_id || '',
        opportunity_name: sow.opportunity_name || '',
        opportunity_amount: sow.opportunity_amount || undefined,
        opportunity_stage: sow.opportunity_stage || '',
        opportunity_close_date: sow.opportunity_close_date || undefined,
      },
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
          duration: sow.duration || '',
        },
      },
    };

    return NextResponse.json(transformedSow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 