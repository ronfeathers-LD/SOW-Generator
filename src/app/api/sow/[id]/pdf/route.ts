import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFGenerator } from '@/lib/pdf-generator';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🧪 PDF environment test for SOW:', id);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('📁 Current working directory:', process.cwd());
    
    // Test file system access
    const logoPath = join(process.cwd(), 'public', 'images', 'leandata-logo.png');
    const logoExists = existsSync(logoPath);
    
    // Test browser availability
    let browserTest = 'Not tested';
    try {
      const { launchPuppeteerBrowser } = await import('@/lib/pdf-generator');
      const browser = await launchPuppeteerBrowser();
      browserTest = 'Success';
      await browser.close();
    } catch (error) {
      browserTest = `Failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return NextResponse.json({
      status: 'Environment test completed',
      environment: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      logoFileExists: logoExists,
      logoPath: logoPath,
      browserTest: browserTest,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Environment test failed:', error);
    return NextResponse.json(
      { 
        error: 'Environment test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🚀 PDF generation request for SOW:', id);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('📁 Current working directory:', process.cwd());
    
    // Check if we're in production and warn about potential Chrome issues
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Production environment detected - Chrome installation may be required');
      
      // Check if this is a serverless environment
      if (process.cwd() === '/var/task') {
        console.log('🚨 Serverless environment detected (/var/task) - limited browser capabilities');
      }
    }
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch SOW data
    const { data: sowData, error: fetchError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !sowData) {
      console.error('❌ Failed to fetch SOW data:', fetchError);
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    console.log('✅ SOW data fetched successfully');

    // Transform the data to match the PDFGenerator interface
    const transformedData = {
      id: sowData.id,
      sow_title: sowData.sow_title || '',
      client_name: sowData.client_name || '',
      company_logo: sowData.company_logo || '',
      client_signer_name: sowData.client_signer_name || '',
      client_title: sowData.client_title || '',
      client_email: sowData.client_email || '',
      signature_date: sowData.signature_date || '',
      deliverables: sowData.deliverables || '',
      objectives_description: sowData.objectives_description || '',
      objectives_key_objectives: sowData.objectives_key_objectives || [],
      content: sowData.content || '',
      client_roles: sowData.client_roles || '',
      pricing_roles: sowData.pricing_roles || '',
      pricing_total: sowData.pricing_roles?.total_amount || 0,
      pricing_subtotal: sowData.pricing_roles?.subtotal || 0,
      pricing_discount: sowData.pricing_roles?.discount_amount || 0,
      pricing_discount_type: sowData.pricing_roles?.discount_type || 'none',
      billing_info: sowData.billing_info || '',
      start_date: sowData.start_date || '',
      timeline_weeks: sowData.timeline_weeks || '',
      products: sowData.products || [],
      number_of_units: sowData.number_of_units || '',
      regions: sowData.regions || '',
      salesforce_tenants: sowData.salesforce_tenants || '',
      units_consumption: sowData.units_consumption || '',
      orchestration_units: sowData.orchestration_units || '',
      bookit_forms_units: sowData.bookit_forms_units || '',
      bookit_links_units: sowData.bookit_links_units || '',
      bookit_handoff_units: sowData.bookit_handoff_units || '',
      custom_intro_content: sowData.custom_intro_content || '',
      custom_scope_content: sowData.custom_scope_content || '',
      custom_out_of_scope_content: sowData.custom_out_of_scope_content || '',
      custom_objectives_disclosure_content: sowData.custom_objectives_disclosure_content || '',
      custom_assumptions_content: sowData.custom_assumptions_content || '',
      custom_project_phases_content: sowData.custom_project_phases_content || '',
      custom_roles_content: sowData.custom_roles_content || '',
      custom_deliverables_content: sowData.custom_deliverables_content || '',
      custom_objective_overview_content: sowData.custom_objective_overview_content || '',
      custom_key_objectives_content: sowData.custom_key_objectives_content || '',
      template: sowData.template || {},
      customer_signature_name_2: sowData.customer_signature_name_2 || '',
      customer_signature_2: sowData.customer_signature_2 || '',
      customer_email_2: sowData.customer_email_2 || '',
      approval_comments: sowData.approval_comments || '',
      approved_at: sowData.approved_at || '',
      approved_by: sowData.approved_by || '',
      project_description: sowData.objectives_description || sowData.project_description || '',
      leandata_name: sowData.leandata_name || '',
      leandata_title: sowData.leandata_title || '',
      leandata_email: sowData.leandata_email || '',
      opportunity_id: sowData.opportunity_id || '',
      opportunity_name: sowData.opportunity_name || '',
      opportunity_amount: sowData.pricing_roles?.total_amount || sowData.opportunity_amount || '',
      opportunity_stage: sowData.opportunity_stage || '',
      opportunity_close_date: sowData.opportunity_close_date || '',
      billing_company_name: sowData.billing_company_name || '',
      billing_contact_name: sowData.billing_contact_name || '',
      billing_address: sowData.billing_address || '',
      billing_email: sowData.billing_email || '',
      purchase_order_number: sowData.purchase_order_number || ''
    };

    // Use the working PDFGenerator class
    const pdfGenerator = new PDFGenerator();
    
    try {
      // Generate the PDF with timeout
      console.log('⏱️ Starting PDF generation with timeout...');
      const pdfBuffer = await Promise.race([
        pdfGenerator.generateSOWPDF(transformedData),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout after 60 seconds')), 60000)
        )
      ]);
      
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Check if this is an alternative format (HTML instead of PDF)
      const isHTML = pdfBuffer.length > 0 && 
        new TextDecoder().decode(pdfBuffer.slice(0, 100)).includes('<!DOCTYPE html>');
      
      if (isHTML) {
        console.log('📄 Returning HTML format for client-side PDF conversion');
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="SOW-${id}.html"`
          }
        });
      } else {
        // Return the PDF as a response
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="SOW-${id}.pdf"`
          }
        });
      }
    } finally {
      // Clean up
      await pdfGenerator.close();
      console.log('✅ PDF generator cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    
    // Provide more specific error messages for common issues
    let errorMessage = 'Failed to generate PDF';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorDetails.includes('Could not find Chrome') || errorDetails.includes('Chrome installation')) {
      errorMessage = 'PDF generation failed: Chrome browser not available. The system is attempting to install Chrome automatically.';
      errorDetails = 'Browser installation in progress. Please try again in a few minutes.';
    } else if (errorDetails.includes('timeout')) {
      errorMessage = 'PDF generation failed: Request timed out. The PDF may be too complex or the system is under heavy load.';
    } else if (errorDetails.includes('serverless environment') || errorDetails.includes('strict browser restrictions')) {
      errorMessage = 'PDF generation failed: Serverless environment detected with browser restrictions.';
      errorDetails = 'The system attempted alternative PDF generation methods. If you received an HTML file, you can convert it to PDF using your browser\'s print function or online PDF converters.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        suggestion: 'If this persists, contact support with the error details above.'
      },
      { status: 500 }
    );
  }
}