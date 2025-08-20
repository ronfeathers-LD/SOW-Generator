import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// TypeScript interfaces for SOW data
interface SOWRole {
  role?: string;
  role_name?: string;
  contact_title?: string;
  name?: string;
  email?: string;
  responsibilities?: string;
  rate_per_hour?: number | string;
  ratePerHour?: number | string;
  rate?: number | string;
  total_hours?: number | string;
  totalHours?: number | string;
  hours?: number | string;
  total_cost?: number | string;
  totalCost?: number | string;
}

interface SOWBillingInfo {
  company_name?: string;
  billing_contact?: string;
  billing_address?: string;
  billing_email?: string;
  po_number?: string;
  payment_terms?: string;
  currency?: string;
}

interface SOWTemplate {
  regions?: string;
  products?: string[];
  sow_title?: string;
  client_name?: string;
  lean_data_name?: string;
  opportunity_id?: string;
  timeline_weeks?: string;
  lean_data_email?: string;
  lean_data_title?: string;
  number_of_units?: string;
  opportunity_name?: string;
  opportunity_stage?: string;
  units_consumption?: string;
  opportunity_amount?: number;
  salesforce_tenants?: string;
  opportunity_close_date?: string;
  customer_signature_name?: string;
  customer_signature?: string;
  billing_company_name?: string;
  billing_contact_name?: string;
  billing_address?: string;
  purchase_order_number?: string;
}

interface SOWObjectives {
  description?: string;
  key_objectives?: string[];
}

interface SOWScope {
  deliverables?: string[] | string;
}

interface SOWPricing {
  roles?: SOWRole[];
  project_management_included?: boolean;
  project_management_hours?: number;
  project_management_rate?: number;
  base_hourly_rate?: number;
  discount_type?: string;
  discount_amount?: number;
  discount_percentage?: number;
  subtotal?: number;
  discount_total?: number;
  total_amount?: number;
  auto_calculated?: boolean;
  last_calculated?: string | null;
}

interface SOWData {
  id: string;
  header?: { sow_title?: string };
  sow_title?: string;
  client_name?: string;
  company_logo?: string;
  client_signer_name?: string;
  client_title?: string;
  client_email?: string;
  client_signature?: { signature_date?: string };
  signature_date?: string;
  deliverables?: string[] | string;
  objectives?: SOWObjectives | string;
  objectives_description?: string;
  objectives_key_objectives?: string[];
  project_description?: string;
  leandata_name?: string;
  leandata_title?: string;
  leandata_email?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_amount?: number;
  opportunity_stage?: string;
  opportunity_close_date?: string;
  timeline_weeks?: string;
  start_date?: string;
  products?: string[];
  number_of_units?: string;
  regions?: string;
  salesforce_tenants?: string;
  units_consumption?: string;
  orchestration_units?: string;
  bookit_forms_units?: string;
  bookit_links_units?: string;
  bookit_handoff_units?: string;
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_out_of_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_assumptions_content?: string;
  custom_project_phases_content?: string;
  custom_roles_content?: string;
  custom_deliverables_content?: string;
  custom_objective_overview_content?: string;
  custom_key_objectives_content?: string;
  client_roles?: SOWRole[];
  clientRoles?: SOWRole[];
  pricing_roles?: SOWRole[] | { roles: SOWRole[] } | SOWPricing;
  pricingRoles?: SOWRole[];
  billing_info?: SOWBillingInfo;
  billingInfo?: SOWBillingInfo;
  pricing?: SOWPricing;
  template?: SOWTemplate | string;
  scope?: SOWScope | string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`🚀 Starting PDF generation for SOW: ${id}`);
    
    // Get SOW data directly from the database (server-side, no auth needed)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
    

    
    // Generate the exact same HTML as the print page (server-side rendered)
    const html = generatePrintPageHTML(sowData);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    try {
      // Set the HTML content directly (no navigation needed)
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      console.log('📊 Generating PDF...');
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      console.log(`✅ PDF generated successfully! Size: ${pdfBuffer.length} bytes`);
      
      // Close browser
      await browser.close();
      
      // Return the PDF as a response
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="SOW-${id}.pdf"`
        }
      });
      
    } catch (error) {
      console.error('❌ Error during PDF generation:', error);
      await browser.close();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generatePrintPageHTML(sowData: SOWData): string {
  // Parse JSONB fields - they might already be objects or need parsing
  const objectives = typeof sowData.objectives === 'string' ? JSON.parse(sowData.objectives) : (sowData.objectives || {});
  const scope = typeof sowData.scope === 'string' ? JSON.parse(sowData.scope) : (sowData.scope || {});
  const template = typeof sowData.template === 'string' ? JSON.parse(sowData.template) : (sowData.template || {});
  
  // Transform the data exactly like the print page does
  const sow = {
    id: sowData.id,
    sowTitle: sowData.header?.sow_title || sowData.sow_title || (typeof template === 'object' ? template.sow_title : '') || '',
    clientName: (typeof template === 'object' ? template.client_name : '') || sowData.client_name || '',
    companyLogo: sowData.company_logo || '',
    clientSignerName: (typeof template === 'object' ? template.customer_signature_name : '') || sowData.client_signer_name || '',
    clientTitle: (typeof template === 'object' ? template.customer_signature : '') || sowData.client_title || '',
    clientEmail: (typeof template === 'object' ? template.customer_email : '') || sowData.client_email || '',
    signatureDate: sowData.client_signature?.signature_date || sowData.signature_date || '',
    deliverables: (() => {
      const rawDeliverables = (typeof scope === 'object' ? scope.deliverables : '') || sowData.deliverables || '';
      if (Array.isArray(rawDeliverables)) {
        return rawDeliverables;
      }
      if (typeof rawDeliverables === 'string') {
        return rawDeliverables.split('\n').filter(line => line.trim().length > 0);
      }
      return [];
    })(),
    objectivesDescription: (typeof sowData.objectives === 'object' ? sowData.objectives?.description : '') || sowData.objectives_description || (typeof objectives === 'object' ? objectives.description : '') || '',
    objectivesKeyObjectives: (typeof sowData.objectives === 'object' ? sowData.objectives?.key_objectives : []) || sowData.objectives_key_objectives || (typeof objectives === 'object' ? objectives.key_objectives : []) || [],
    projectDescription: sowData.project_description || sowData.objectives_description || (typeof objectives === 'object' ? objectives.description : '') || '',
    leandataName: sowData.leandata_name || (typeof template === 'object' ? template.lean_data_name : '') || 'Agam Vasani',
    leandataTitle: sowData.leandata_title || (typeof template === 'object' ? template.lean_data_title : '') || 'VP Customer Success',
    leandataEmail: sowData.leandata_email || (typeof template === 'object' ? template.lean_data_email : '') || 'agam.vasani@leandata.com',
    opportunityId: sowData.opportunity_id || (typeof template === 'object' ? template.opportunity_id : '') || '',
    opportunityName: sowData.opportunity_name || (typeof template === 'object' ? template.opportunity_name : '') || '',
    opportunityAmount: sowData.opportunity_amount || (typeof template === 'object' ? template.opportunity_amount : 0) || 0,
    opportunityStage: sowData.opportunity_stage || (typeof template === 'object' ? template.opportunity_stage : '') || '',
    opportunityCloseDate: sowData.opportunity_close_date || (typeof template === 'object' ? template.opportunity_close_date : '') || '',
    timelineWeeks: (typeof template === 'object' ? template.timeline_weeks : '') || sowData.timeline_weeks || '',
    startDate: sowData.start_date || '',
    products: (typeof template === 'object' ? template.products : []) || sowData.products || [],
    numberOfUnits: (typeof template === 'object' ? template.number_of_units : '') || sowData.number_of_units || '',
    regions: (typeof template === 'object' ? template.regions : '') || sowData.regions || '',
    salesforceTenants: (typeof template === 'object' ? template.salesforce_tenants : '') || sowData.salesforce_tenants || '',
    unitsConsumption: (typeof template === 'object' ? template.units_consumption : '') || sowData.units_consumption || '',
    orchestrationUnits: sowData.orchestration_units || '',
    bookitFormsUnits: sowData.bookit_forms_units || '',
    bookitLinksUnits: sowData.bookit_links_units || '',
    bookitHandoffUnits: sowData.bookit_handoff_units || '',
    customIntroContent: sowData.custom_intro_content || '',
    customScopeContent: sowData.custom_scope_content || '',
    customOutOfScopeContent: sowData.custom_out_of_scope_content || '',
    customObjectivesDisclosureContent: sowData.custom_objectives_disclosure_content || '',
    customAssumptionsContent: sowData.custom_assumptions_content || '',
    customProjectPhasesContent: sowData.custom_project_phases_content || '',
    customRolesContent: sowData.custom_roles_content || '',
    customDeliverablesContent: sowData.custom_deliverables_content || '',
    customObjectiveOverviewContent: sowData.custom_objective_overview_content || '',
    customKeyObjectivesContent: sowData.custom_key_objectives_content || '',
    clientRoles: (() => {
      // Use the raw database fields first, then fall back to transformed API response
      const rawClientRoles = sowData.client_roles || sowData.clientRoles || [];
      if (Array.isArray(rawClientRoles)) {
        return rawClientRoles.map((role: SOWRole) => ({
          role: role.role || role.contact_title || '',
          name: role.name || '',
          email: role.email || '',
          responsibilities: role.responsibilities || ''
        }));
      }
      return [];
    })(),
    pricingRoles: (() => {
      // Use the raw database fields first, then fall back to transformed API response
      const rawPricingRoles = sowData.pricing_roles || sowData.pricingRoles || [];
      if (Array.isArray(rawPricingRoles)) {
        return rawPricingRoles.map((role: SOWRole) => ({
          role: role.role || role.role_name || 'Unknown Role',
          ratePerHour: parseFloat(String(role.rate_per_hour || role.ratePerHour || role.rate || 0)),
          totalHours: parseFloat(String(role.total_hours || role.totalHours || role.hours || 0)),
          totalCost: parseFloat(String(role.total_cost || role.totalCost || (parseFloat(String(role.total_hours || 0)) * parseFloat(String(role.rate_per_hour || 0))) || 0))
        }));
      } else if (rawPricingRoles.roles && Array.isArray(rawPricingRoles.roles)) {
        // Handle the case where pricing_roles is an object with a roles array
        return rawPricingRoles.roles.map((role: SOWRole) => ({
          role: role.role || role.role_name || 'Unknown Role',
          ratePerHour: parseFloat(String(role.rate_per_hour || role.ratePerHour || role.rate || 0)),
          totalHours: parseFloat(String(role.total_hours || role.totalHours || role.hours || 0)),
          totalCost: parseFloat(String(role.total_cost || role.totalCost || (parseFloat(String(role.total_hours || 0)) * parseFloat(String(role.rate_per_hour || 0))) || 0))
        }));
      }
      return [];
    })(),
    billingInfo: (() => {
      // Use the raw database fields first, then fall back to transformed API response
      const rawBillingInfo = sowData.billing_info || sowData.billingInfo || {};
      return {
        companyName: rawBillingInfo.company_name || (typeof template === 'object' ? template.billing_company_name : '') || '',
        billingContact: rawBillingInfo.billing_contact || (typeof template === 'object' ? template.billing_contact_name : '') || '',
        billingAddress: rawBillingInfo.billing_address || (typeof template === 'object' ? template.billing_address : '') || '',
        billingEmail: rawBillingInfo.billing_email || (typeof template === 'object' ? template.billing_email : '') || '',
        poNumber: rawBillingInfo.po_number || (typeof template === 'object' ? template.purchase_order_number : '') || '',
        paymentTerms: rawBillingInfo.payment_terms || 'Net 30',
        currency: rawBillingInfo.currency || 'USD',
      };
    })(),
    pricing: {
      roles: (() => {
        // Use the raw database fields first, then fall back to transformed API response
        const rawPricingRoles = sowData.pricing_roles || sowData.pricingRoles || [];
        if (Array.isArray(rawPricingRoles)) {
                  return rawPricingRoles.map((role: SOWRole) => ({
          role: role.role || role.role_name || '',
          ratePerHour: parseFloat(String(role.rate_per_hour || role.ratePerHour || role.rate || 0)),
          totalHours: parseFloat(String(role.total_hours || role.totalHours || role.hours || 0)),
          totalCost: parseFloat(String(role.total_cost || role.totalCost || (parseFloat(String(role.total_hours || 0)) * parseFloat(String(role.rate_per_hour || 0))) || 0))
        }));
        } else if (rawPricingRoles.roles && Array.isArray(rawPricingRoles.roles)) {
          // Handle the case where pricing_roles is an object with a roles array
          return rawPricingRoles.roles.map((role: SOWRole) => ({
            role: role.role || role.role_name || '',
            ratePerHour: parseFloat(String(role.rate_per_hour || role.ratePerHour || role.rate || 0)),
            totalHours: parseFloat(String(role.total_hours || role.totalHours || role.hours || 0)),
            totalCost: parseFloat(String(role.total_cost || role.totalCost || (parseFloat(String(role.total_hours || 0)) * parseFloat(String(role.rate_per_hour || 0))) || 0))
          }));
        }
        return [];
      })(),
      billing: (() => {
        // Use the raw database fields first, then fall back to transformed API response
        const rawBillingInfo = sowData.billing_info || sowData.billingInfo || {};
        return {
          companyName: rawBillingInfo.company_name || (typeof template === 'object' ? template.billing_company_name : '') || '',
          billingContact: rawBillingInfo.billing_contact || (typeof template === 'object' ? template.billing_contact_name : '') || '',
          billingAddress: rawBillingInfo.billing_address || (typeof template === 'object' ? template.billing_address : '') || '',
          billingEmail: rawBillingInfo.billing_email || (typeof template === 'object' ? template.billing_email : '') || '',
          poNumber: rawBillingInfo.po_number || (typeof template === 'object' ? template.purchase_order_number : '') || '',
          paymentTerms: rawBillingInfo.payment_terms || 'Net 30',
          currency: rawBillingInfo.currency || 'USD',
        };
      })(),
      project_management_included: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'project_management_included' in rawPricing) {
          return (rawPricing as SOWPricing).project_management_included || false;
        }
        return false;
      })(),
      project_management_hours: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'project_management_hours' in rawPricing) {
          return (rawPricing as SOWPricing).project_management_hours || 0;
        }
        return 0;
      })(),
      project_management_rate: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'project_management_rate' in rawPricing) {
          return (rawPricing as SOWPricing).project_management_rate || 0;
        }
        return 0;
      })(),
      base_hourly_rate: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'base_hourly_rate' in rawPricing) {
          return (rawPricing as SOWPricing).base_hourly_rate || 0;
        }
        return 0;
      })(),
      discount_type: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'discount_type' in rawPricing) {
          return (rawPricing as SOWPricing).discount_type || '';
        }
        return '';
      })(),
      discount_amount: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'discount_amount' in rawPricing) {
          return (rawPricing as SOWPricing).discount_amount || 0;
        }
        return 0;
      })(),
      discount_percentage: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'discount_percentage' in rawPricing) {
          return (rawPricing as SOWPricing).discount_percentage || 0;
        }
        return 0;
      })(),
      subtotal: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'subtotal' in rawPricing) {
          return (rawPricing as SOWPricing).subtotal || 0;
        }
        return 0;
      })(),
      discount_total: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'discount_total' in rawPricing) {
          return (rawPricing as SOWPricing).discount_total || 0;
        }
        return 0;
      })(),
      total_amount: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'total_amount' in rawPricing) {
          return (rawPricing as SOWPricing).total_amount || 0;
        }
        return 0;
      })(),
      auto_calculated: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'auto_calculated' in rawPricing) {
          return (rawPricing as SOWPricing).auto_calculated || false;
        }
        return false;
      })(),
      last_calculated: (() => {
        const rawPricing = sowData.pricing_roles || sowData.pricing || {};
        if (typeof rawPricing === 'object' && 'last_calculated' in rawPricing) {
          return (rawPricing as SOWPricing).last_calculated || null;
        }
        return null;
      })(),
    }
  };
  
  // Process custom content to replace template variables
  const processCustomContent = (content: string) => {
    if (!content) return content;
    
    return content
      .replace(/\{clientName\}/g, sow.clientName || 'Client')
      .replace(/\{sowTitle\}/g, sow.sowTitle || 'SOW')
      .replace(/\{opportunityName\}/g, sow.opportunityName || 'Project')
      .replace(/\{timelineWeeks\}/g, sow.timelineWeeks || 'X weeks');
  };
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${sow.sowTitle || 'SOW'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: white;
          }
          .print-layout {
            max-width: 100%;
            margin: 0 auto;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          .print\\:mb-8 {
            margin-bottom: 2rem;
          }
          .print\\:min-h-screen {
            min-height: 100vh;
          }
          .print\\:flex {
            display: flex;
          }
          .print\\:flex-col {
            flex-direction: column;
          }
          .print\\:justify-center {
            justify-content: center;
          }
          .text-3xl {
            font-size: 1.875rem;
          }
          .text-lg {
            font-size: 1.125rem;
          }
          .font-bold {
            font-weight: 700;
          }
          .font-semibold {
            font-weight: 600;
          }
          .mb-6 {
            margin-bottom: 1.5rem;
          }
          .mb-4 {
            margin-bottom: 1rem;
          }
          .mb-8 {
            margin-bottom: 2rem;
          }
          .mt-8 {
            margin-top: 2rem;
          }
          .p-4 {
            padding: 1rem;
          }
          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
          .py-3 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }
          .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .text-center {
            text-align: center;
          }
          .text-left {
            text-align: left;
          }
          .text-right {
            text-align: right;
          }
          .text-sm {
            font-size: 0.875rem;
          }
          .text-yellow-800 {
            color: #92400e;
          }
          .text-yellow-700 {
            color: #a16207;
          }
          .text-gray-700 {
            color: #374151;
          }
          .text-gray-600 {
            color: #4b5563;
          }
          .text-gray-900 {
            color: #111827;
          }
          .bg-yellow-50 {
            background-color: #fefce8;
          }
          .bg-white {
            background-color: white;
          }
          .border {
            border: 1px solid;
          }
          .border-yellow-200 {
            border-color: #fde68a;
          }
          .border-gray-200 {
            border-color: #e5e7eb;
          }
          .border-l-4 {
            border-left: 4px solid;
          }
          .border-blue-500 {
            border-color: #3b82f6;
          }
          .rounded-md {
            border-radius: 0.375rem;
          }
          .rounded-lg {
            border-radius: 0.5rem;
          }
          .divide-y {
            border-top: 1px solid;
          }
          .divide-gray-200 {
            border-color: #e5e7eb;
          }
          .overflow-x-auto {
            overflow-x: auto;
          }
          .min-w-full {
            min-width: 100%;
          }
          .whitespace-nowrap {
            white-space: nowrap;
          }
          .hover\\:bg-gray-50:hover {
            background-color: #f9fafb;
          }
          .formatSOWTable {
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            overflow: hidden;
          }
          .formatSOWTable table {
            width: 100%;
            border-collapse: collapse;
          }
          .formatSOWTable th {
            background-color: #f9fafb;
            font-weight: 600;
            padding: 0.75rem 1.5rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .formatSOWTable td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e5e7eb;
          }
          .formatSOWTable tr:last-child td {
            border-bottom: none;
          }
        </style>
      </head>
      <body>
        <div class="min-h-screen bg-white">
          <div class="print-layout">
            <!-- Title Page Section -->
            <div id="title-page" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid print:min-h-screen print:flex print:flex-col print:justify-center">
              <div style="text-align: center; padding: 40px;">
                <!-- LeanData Header Section -->
                <div style="margin-bottom: 40px;">
                  ${sow.companyLogo ? `<img src="${sow.companyLogo}" alt="Company Logo" style="max-width: 120px; height: auto; margin: 0 auto 24px;">` : ''}
                  <p style="font-size: 18px; color: #6B7280; margin: 8px 0;">LeanData Delivery Methodology</p>
                  <p style="font-size: 24px; font-weight: 600; color: #111827; margin: 8px 0;">Statement of Work</p>
                  <p style="font-size: 18px; color: #6B7280; margin: 8px 0;">prepared for ${sow.clientName || 'Client Name'}</p>
                </div>
                
                <h1 style="font-size: 48px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">${sow.sowTitle || 'STATEMENT OF WORK'}</h1>
                <p style="font-size: 24px; color: #6B7280; margin-bottom: 40px;">${sow.clientName || 'Client Name'}</p>
                
                <!-- Client Signature Section -->
                <div style="margin-top: 60px; margin-bottom: 40px; text-align: left;">
                  <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 20px;">This SOW is accepted by ${sow.clientName}:</h3>
                  <div style="margin-bottom: 20px;">
                    <div style="border-bottom: 1px solid #000; margin-bottom: 20px; height: 1px;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <p style="font-size: 18px; font-weight: 500; margin: 8px 0;">${sow.clientSignerName || 'Not Entered'}, ${sow.clientTitle || 'Title Not Entered'}</p>
                        <p style="font-size: 16px; color: #6B7280; margin: 4px 0;">${sow.clientEmail || 'Email Not Entered'}</p>
                      </div>
                      <div style="display: flex; align-items: center; margin-left: 40px;">
                        <div style="border-bottom: 1px solid #000; width: 100px; margin-right: 8px;"></div>
                        <span style="font-size: 16px; font-weight: 500;">DATE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Second Client Signature Section -->
                <div style="margin-top: 20px; margin-bottom: 40px; text-align: left;">
                  <div style="margin-bottom: 20px;">
                    <div style="border-bottom: 1px solid #000; margin-bottom: 20px; height: 1px;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <p style="font-size: 18px; font-weight: 500; margin: 8px 0;">${sow.clientSignerName || 'Not Entered'}, ${sow.clientTitle || 'Title Not Entered'}</p>
                        <p style="font-size: 16px; color: #6B7280; margin: 4px 0;">${sow.clientEmail || 'Email Not Entered'}</p>
                      </div>
                      <div style="display: flex; align-items: center; margin-left: 40px;">
                        <div style="border-bottom: 1px solid #000; width: 100px; margin-right: 8px;"></div>
                        <span style="font-size: 16px; font-weight: 500;">DATE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- LeanData Signature Section -->
                <div style="margin-top: 40px; text-align: left;">
                  <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 20px;">This SOW is accepted by LeanData, Inc.:</h3>
                  <div>
                    <div style="border-bottom: 1px solid #000; margin-bottom: 20px; height: 1px;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <p style="font-size: 18px; font-weight: 500; margin: 8px 0;">${sow.leandataName || 'Agam Vasani'}, ${sow.leandataTitle || 'VP Customer Success'}</p>
                        <p style="font-size: 16px; color: #6B7280; margin: 4px 0;">${sow.leandataEmail || 'agam.vasani@leandata.com'}</p>
                      </div>
                      <div style="display: flex; align-items: center; margin-left: 40px;">
                        <div style="border-bottom: 1px solid #000; width: 100px; margin-right: 8px;"></div>
                        <span style="font-size: 16px; font-weight: 500;">DATE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SOW Intro Section -->
            <div id="sow-intro" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
              <div>
                ${processCustomContent(sow.customIntroContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom intro content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom intro content in the SOW editor.</p>
                  </div>
                `}
              </div>
            </div>

            <!-- Objectives Section -->
            <div id="objectives" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">1. OBJECTIVE</h2>
              
              <!-- SmartMoving-Specific Objectives -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Objective:</h3>
                ${sow.customObjectiveOverviewContent ? `
                  <div>${processCustomContent(sow.customObjectiveOverviewContent)}</div>
                ` : sow.objectivesDescription ? `
                  <p class="mb-4">${sow.objectivesDescription}</p>
                ` : `
                  <p class="mb-4">
                    ${sow.clientName} aims to optimize its Go-to-Market processes by implementing LeanData solutions. The primary objectives are to establish efficient and automated routing mechanisms within Salesforce to achieve real-time lead assignment, account ownership, and improved booking experiences for prospects and customers.
                  </p>
                `}
              </div>

              <!-- Key Objectives -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Key Objectives:</h3>
                ${sow.customKeyObjectivesContent ? `
                  <div>${processCustomContent(sow.customKeyObjectivesContent)}</div>
                ` : sow.objectivesKeyObjectives && sow.objectivesKeyObjectives.length > 0 ? `
                  <ul class="list-disc pl-6 space-y-2">
                    ${sow.objectivesKeyObjectives.map((objective: string) => `
                      <li>${objective}</li>
                    `).join('')}
                  </ul>
                ` : `
                  <p class="text-gray-600 italic">No specific key objectives configured for this SOW.</p>
                `}
              </div>

              <!-- Implementation Details -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">The following are the high-level details as part of the implementation:</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Products:</strong>
                    ${sow.products && sow.products.length > 0 ? `
                      <ul class="list-disc pl-6 mt-2">
                        ${sow.products.map((product: string) => `
                          <li>${product}</li>
                        `).join('')}
                      </ul>
                    ` : `
                      <p class="text-gray-600 italic mt-2">No specific products configured for this SOW.</p>
                    `}
                  </div>
                  <div>
                    <p><strong>Regions/Business Units:</strong> ${sow.regions || 'Not specified'}</p>
                    <p><strong>Salesforce Tenants:</strong> ${sow.salesforceTenants || 'Not specified'}</p>
                    <p><strong>Timeline:</strong> ${sow.timelineWeeks || 'Not specified'} weeks</p>
                    <p><strong>Start and End date:</strong> ${sow.startDate ? `Start date: ${sow.startDate}` : 'Start date not specified'}</p>
                    <p><strong>Units consumption:</strong> ${sow.unitsConsumption || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <!-- Product Units -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Product Units:</h3>
                <div class="grid grid-cols-2 gap-4">
                  ${sow.orchestrationUnits ? `<p><strong>Orchestration Units:</strong> ${sow.orchestrationUnits}</p>` : ''}
                  ${sow.bookitFormsUnits ? `<p><strong>BookIt for Forms Units:</strong> ${sow.bookitFormsUnits}</p>` : ''}
                  ${sow.bookitHandoffUnits ? `<p><strong>BookIt Handoff Units:</strong> ${sow.bookitHandoffUnits}</p>` : ''}
                  ${sow.bookitLinksUnits ? `<p><strong>BookIt Links Units:</strong> ${sow.bookitLinksUnits}</p>` : ''}
                  ${sow.numberOfUnits ? `<p><strong>Number of Units:</strong> ${sow.numberOfUnits}</p>` : ''}
                </div>
              </div>

              <!-- Custom Objectives Content -->
              <div>
                ${processCustomContent(sow.customObjectivesDisclosureContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom objectives content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom objectives content in the SOW editor.</p>
                  </div>
                `}
              </div>
            </div>

            <!-- Scope Section -->
            <div id="scope" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">2. SCOPE</h2>
              
              <!-- Basic Scope -->
              <div class="mb-6">
                <p>The project scope encompasses all activities, deliverables, and milestones required to achieve the stated objectives. This includes but is not limited to planning, development, testing, deployment, and knowledge transfer activities.</p>
              </div>

              <!-- Custom Scope Content -->
              <div class="mb-6">
                ${processCustomContent(sow.customScopeContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom scope content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom scope content in the SOW editor.</p>
                  </div>
                `}
              </div>
              
              <!-- Out of Scope Section -->
              ${sow.customOutOfScopeContent ? `
                <div class="mt-8">
                  <h3 class="text-lg font-semibold mb-4">Out of Scope</h3>
                  <div>
                    ${processCustomContent(sow.customOutOfScopeContent)}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Project Phases Section -->
            <div id="project-phases" class="formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">3. PROJECT PHASES</h2>
              <div>
                ${processCustomContent(sow.customProjectPhasesContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom project phases content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom project phases content in the SOW editor.</p>
                  </div>
                `}
              </div>
            </div>

            <!-- Roles Section -->
            <div id="roles" class="formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>
              <div>
                ${processCustomContent(sow.customRolesContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom roles content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom roles content in the SOW editor.</p>
                  </div>
                `}
              </div>
              
              <!-- Display Client Roles if they exist -->
              ${sow.clientRoles && Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 ? `
                <div class="mt-8">
                  <h3 class="text-lg font-semibold mb-4">Client Roles</h3>
                  <div class="overflow-x-auto formatSOWTable">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="px-6 py-3 text-left">Role</th>
                          <th class="px-6 py-3 text-left">Name</th>
                          <th class="px-6 py-3 text-left">Email</th>
                          <th class="px-6 py-3 text-left">Responsibilities</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        ${sow.clientRoles.map((role: SOWRole, idx: number) => `
                          <tr key="${idx}" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.role || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.name || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.email || 'N/A'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">${role.responsibilities || 'N/A'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Pricing Section -->
            <div id="pricing" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">5. PRICING</h2>
              
              <!-- Pricing Introduction -->
              <div class="mb-6 p-4 rounded-lg border-l-4 border-blue-500" style="background-color: #F9FAFB;">
                <p class="text-gray-700">
                  The tasks above will be completed on a <strong>time and material basis</strong>, using the LeanData standard workday of 8 hours for a duration of <strong>${sow.timelineWeeks ? (() => {
                    const totalWeeks = parseFloat(sow.timelineWeeks) || 0;
                    if (totalWeeks < 1) {
                      const days = Math.ceil(totalWeeks * 7);
                      return `${days} ${days === 1 ? 'day' : 'days'}`;
                    } else {
                      return `${totalWeeks} weeks`;
                    }
                  })() : 'N/A'}</strong>.
                </p>
                <p class="text-sm text-gray-600 mt-2">
                  Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
                </p>
              </div>

              <!-- Project Timeline Display -->
              ${sow.customProjectPhasesContent ? `
                <div class="mb-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Project Phases</h3>
                  <div>
                    ${processCustomContent(sow.customProjectPhasesContent)}
                  </div>
                </div>
              ` : sow.timelineWeeks ? `
                <div class="mb-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                  <div class="bg-white shadow rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-6 py-4 border-b border-gray-200" style="background-color: #F9FAFB;">
                      <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 1rem; font-size: 0.875rem; font-weight: 500; color: #374151;">
                        <div>Phase</div>
                        <div>Description</div>
                        <div style="text-align: right;">Duration</div>
                      </div>
                    </div>
                    
                    <div class="divide-y divide-gray-200">
                      ${(() => {
                        const totalWeeks = parseFloat(sow.timelineWeeks) || 0;
                        
                        // Helper function to format duration with appropriate units
                        const formatDuration = (weeks: number) => {
                          if (weeks < 1) {
                            // Convert to days and round up to nearest day
                            const days = Math.ceil(weeks * 7);
                            return `${days} ${days === 1 ? 'day' : 'days'}`;
                          } else {
                            // Round to 1 decimal place for weeks
                            const roundedWeeks = Math.round(weeks * 10) / 10;
                            return `${roundedWeeks} ${roundedWeeks === 1 ? 'week' : 'weeks'}`;
                          }
                        };
                        
                        if (totalWeeks <= 0) {
                          return '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: #6B7280;">Timeline not specified</td></tr>';
                        }
                        
                        // Calculate phase durations
                        const phases = [
                          { name: '1. ENGAGE', description: 'Project kickoff and planning', duration: Math.max(1, Math.round(totalWeeks * 0.15)) },
                          { name: '2. DISCOVERY', description: 'Requirements gathering and analysis', duration: Math.max(2, Math.round(totalWeeks * 0.25)) },
                          { name: '3. BUILD', description: 'Solution development and configuration', duration: Math.max(2, Math.round(totalWeeks * 0.25)) },
                          { name: '4. TEST', description: 'Quality assurance and validation', duration: Math.max(1, Math.round(totalWeeks * 0.15)) },
                          { name: '5. DEPLOY', description: 'Production deployment and go-live', duration: Math.max(1, Math.round(totalWeeks * 0.1)) },
                          { name: '6. HYPERCARE', description: 'Post-deployment support and transition', duration: Math.max(1, Math.round(totalWeeks * 0.1)) }
                        ];
                        
                        return phases.map(phase => `
                          <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB;">
                            <div style="font-weight: 600;">${phase.name}</div>
                            <div>${phase.description}</div>
                            <div style="text-align: right;">${formatDuration(phase.duration)}</div>
                          </div>
                        `).join('');
                      })()}
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Pricing Display -->
              ${sow.pricingRoles && Array.isArray(sow.pricingRoles) && sow.pricingRoles.length > 0 ? `
                <div class="mb-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Pricing Breakdown</h3>
                  <div class="overflow-x-auto formatSOWTable">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="px-6 py-3 text-left">Role</th>
                          <th class="px-6 py-3 text-left">Rate/Hour</th>
                          <th class="px-6 py-3 text-left">Total Hours</th>
                          <th class="px-6 py-3 text-left">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        ${sow.pricingRoles.map((role: SOWRole, idx: number) => `
                          <tr key="${idx}" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.role || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${role.ratePerHour || 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${role.totalHours || 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${role.totalCost || 0}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}

              <!-- Pricing Summary -->
              ${sow.pricing && sow.pricing.total_amount ? `
                <div class="mb-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Pricing Summary</h3>
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                      <span class="font-medium">Subtotal:</span>
                      <span>$${sow.pricing.subtotal || 0}</span>
                    </div>
                    ${sow.pricing.discount_amount > 0 ? `
                      <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">Discount:</span>
                        <span>$${sow.pricing.discount_amount || 0}</span>
                      </div>
                    ` : ''}
                    <div class="flex justify-between items-center font-bold text-lg border-t pt-2">
                      <span>Total Amount:</span>
                      <span>$${sow.pricing.total_amount || 0}</span>
                    </div>
                    ${sow.pricing.last_calculated ? `
                      <p class="text-sm text-gray-600 mt-2">Last calculated: ${new Date(sow.pricing.last_calculated).toLocaleString()}</p>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Cost Overrun and Change Order Information -->
              <div class="mb-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-700 mb-3">
                    LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.
                  </p>
                  <p class="text-sm text-gray-700">
                    Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. Additional hours will be billed at the Rate/Hr.
                  </p>
                </div>
              </div>

              <!-- Billing Information -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Billing Information</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Company Name:</strong> ${sow.billingInfo.companyName || 'N/A'}</p>
                      <p><strong>Billing Contact Name:</strong> ${sow.billingInfo.billingContact || 'N/A'}</p>
                      <p><strong>Billing Address:</strong> ${sow.billingInfo.billingAddress || 'N/A'}</p>
                      <p><strong>Billing Email:</strong> ${sow.billingInfo.billingEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>Purchase Order Number:</strong> ${sow.billingInfo.poNumber || 'PO provided by customer'}</p>
                      <p><strong>Payment Terms:</strong> ${sow.billingInfo.paymentTerms || 'Net 30'}</p>
                      <p><strong>Currency:</strong> ${sow.billingInfo.currency || 'USD'}</p>
                      <p><strong>Billing Cycle:</strong> Monthly or upon completion of major milestones</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Assumptions Section -->
            <div id="assumptions" class="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 class="text-3xl font-bold mb-6">6. ASSUMPTIONS</h2>
              <div>
                ${processCustomContent(sow.customAssumptionsContent) || `
                  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom assumptions content not configured</p>
                    <p class="text-yellow-700 text-sm mt-1">Please configure the custom assumptions content in the SOW editor.</p>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}