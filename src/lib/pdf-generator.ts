import puppeteer, { Browser } from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { parseObjectives } from './utils/parse-objectives';
import { sortProducts } from './utils/productSorting';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Convert LeanData logo to base64 for PDF embedding
 */
function getLeanDataLogoBase64(): string {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'leandata-logo.png');
    console.log('🔍 Looking for logo at:', logoPath);
    
    // Check if file exists before trying to read it
    if (!existsSync(logoPath)) {
      console.warn('⚠️ Logo file not found at:', logoPath);
      return '';
    }
    
    const logoBuffer = readFileSync(logoPath);
    const base64Logo = logoBuffer.toString('base64');
    console.log('✅ Logo loaded successfully, size:', logoBuffer.length, 'bytes');
    return `data:image/png;base64,${base64Logo}`;
  } catch (error) {
    console.warn('⚠️ Could not load LeanData logo, using fallback:', error);
    // Fallback to a simple styled div if logo can't be loaded
    return '';
  }
}

/**
 * Robust Puppeteer browser launcher that handles production environments
 * Falls back to bundled Chromium if system Chrome is not available
 */
export async function launchPuppeteerBrowser(): Promise<Browser> {
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection'
    ],
    timeout: 60000, // Increased timeout
    ignoreDefaultArgs: ['--disable-extensions']
  };

  try {
    // First try with production Chrome path (common in production environments)
    console.log('🔍 Attempting to launch production Chrome...');
    return await puppeteer.launch({
      ...launchOptions,
      executablePath: '/usr/bin/google-chrome-stable'
    });
  } catch (error) {
    console.log('⚠️ Production Chrome not found, trying alternative paths...');
    
    try {
      // Try alternative Chrome paths
      return await puppeteer.launch({
        ...launchOptions,
        executablePath: '/usr/bin/chromium-browser'
      });
    } catch (error2) {
      console.log('⚠️ Alternative Chrome paths not found, trying bundled Chromium with minimal args...');
      
      try {
        // Try with minimal args for bundled Chromium
        return await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ],
          timeout: 60000
        });
      } catch (error3) {
        console.log('⚠️ Bundled Chromium failed, trying with no args...');
        
        try {
          // Last resort - try with no custom args
          return await puppeteer.launch({
            headless: true,
            timeout: 60000
          });
        } catch (error4) {
          console.error('❌ All Puppeteer launch attempts failed:', {
            productionChrome: error instanceof Error ? error.message : String(error),
            alternativeChrome: error2 instanceof Error ? error2.message : String(error2),
            bundledChromium: error3 instanceof Error ? error3.message : String(error3),
            noArgs: error4 instanceof Error ? error4.message : String(error4)
          });
          
          // Provide more helpful error message
          throw new Error(
            'Failed to launch any browser for PDF generation. ' +
            'This usually means Chrome/Chromium is not available in the production environment. ' +
            'Please ensure the postinstall script runs: "puppeteer browsers install chrome"'
          );
        }
      }
    }
  }
}

interface PricingRole {
  role?: string;
  name?: string;
  ratePerHour?: number;
  rate_per_hour?: number;
  totalHours?: number;
  total_hours?: number;
}

interface ClientRole {
  role?: string;
  contact_title?: string;
  name?: string;
  email?: string;
  responsibilities?: string;
}

interface BillingInfo {
  company_name?: string;
  billing_contact?: string;
  billing_address?: string;
  billing_email?: string;
  po_number?: string;
}

interface SOWData {
  id: string;
  sow_title?: string;
  client_name?: string;
  company_logo?: string;
  client_signer_name?: string;
  client_title?: string;
  client_email?: string;
  signature_date?: string;
  deliverables?: string[] | string;
  objectives_description?: string;
  objectives_key_objectives?: string[] | string;
  content?: string;
  client_roles?: string | ClientRole[] | { roles?: ClientRole[] };
  pricing_roles?: string | PricingRole[] | { roles?: PricingRole[] };
  pricing_total?: number;
  pricing_subtotal?: number;
  pricing_discount?: number;
  pricing_discount_type?: string;
  pricing_discount_percentage?: number;
  billing_info?: string | BillingInfo;
  start_date?: string;
  timeline_weeks?: string;
  products?: string[] | string;
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
  template?: Record<string, string | number | boolean>;
  customer_signature_name_2?: string;
  customer_signature_2?: string;
  customer_email_2?: string;
  approval_comments?: string;
  approved_at?: string;
  approved_by?: string;
  project_description?: string;
  leandata_name?: string;
  leandata_title?: string;
  leandata_email?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_amount?: string | number;
  opportunity_stage?: string;
  opportunity_close_date?: string;
  billing_company_name?: string;
  billing_contact_name?: string;
  billing_address?: string;
  billing_email?: string;
  purchase_order_number?: string;
  pm_hours_requirement_disabled?: boolean;
}

export class PDFGenerator {
  private browser: import('puppeteer').Browser | import('puppeteer-core').Browser | null = null;

  async initialize() {
    if (!this.browser) {
      try {
        if (process.env.NODE_ENV === 'production') {
          // Use Vercel-optimized approach for production
          console.log('🚀 Launching Vercel-optimized Chromium...');
          
          this.browser = await puppeteerCore.launch({
            args: [
              ...chromium.args,
              '--hide-scrollbars',
              '--disable-web-security',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-extensions',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-features=VizDisplayCompositor',
              '--disable-ipc-flooding-protection',
              '--memory-pressure-off',
              '--max_old_space_size=4096'
            ],
            defaultViewport: { width: 1200, height: 1600 },
            executablePath: await chromium.executablePath(),
            headless: true,
            timeout: 60000
          });
          
          console.log('✅ Vercel-optimized Chromium launched successfully');
        } else {
          // Use full puppeteer for local development
          console.log('🚀 Launching full Puppeteer for local development...');
          
          this.browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ],
            timeout: 60000
          });
          
          console.log('✅ Full Puppeteer launched successfully');
        }
      } catch (error) {
        console.error('❌ Failed to launch browser:', error);
        
        // Fallback to HTML generation if browser fails
        throw new Error(
          'Failed to launch browser for PDF generation. ' +
          'Falling back to HTML generation for serverless environments.'
        );
      }
    }
  }

  async generateSOWPDF(sowData: SOWData): Promise<Uint8Array> {
    console.log('🚀 Starting PDF generation for SOW:', sowData.id);
    
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      console.log('✅ Browser initialized successfully');
      const page = await this.browser.newPage();
      console.log('✅ New page created');
      
      try {
        // Generate HTML content for the SOW
        console.log('📝 Generating HTML content...');
        const htmlContent = this.generateSOWHTML(sowData);
        console.log('✅ HTML content generated, length:', htmlContent.length);
        
        // Set content and wait for any dynamic content to load
        console.log('🌐 Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        console.log('✅ Page content set successfully');
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });
        console.log('✅ Viewport set');
        
        // Generate PDF
        console.log('📄 Generating PDF...');
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
        
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        return new Uint8Array(pdfBuffer);
        
      } catch (error) {
        console.error('❌ Error during PDF generation process:', error);
        throw error;
      } finally {
        await page.close();
        console.log('✅ Page closed');
      }
    } catch (error) {
      console.error('❌ Fatal error in PDF generation:', error);
      
      // If browser-based generation fails, try alternative approach
      if (error instanceof Error && error.message.includes('browser restrictions')) {
        console.log('🔄 Attempting alternative PDF generation method...');
        return this.generatePDFAlternative(sowData);
      }
      
      throw error;
    }
  }

  /**
   * Alternative PDF generation method for serverless environments
   * This generates a simple HTML file that can be converted to PDF by the client
   */
  private generatePDFAlternative(sowData: SOWData): Uint8Array {
    console.log('📄 Generating alternative PDF format (HTML file)...');
    
    const htmlContent = this.generateSOWHTML(sowData);
    const htmlBytes = new TextEncoder().encode(htmlContent);
    
    console.log('✅ Alternative HTML content generated, size:', htmlBytes.length, 'bytes');
    return htmlBytes;
  }

  private generateSOWHTML(sowData: SOWData): string {
    const title = sowData.sow_title || 'Untitled SOW';
    const clientName = sowData.client_name || 'Unknown Client';
    const companyLogo = sowData.company_logo || '';
    const leanDataLogoBase64 = getLeanDataLogoBase64();
    

    
    // Parse objectives that might be stored as HTML
            const objectives = this.parseObjectivesInternal(sowData.objectives_key_objectives);
    const clientRoles = this.parseJSONField(sowData.client_roles, []) as ClientRole[];
    // Parse pricing roles - handle both direct array and nested structure
    let pricingRoles: PricingRole[] = [];
    if (sowData.pricing_roles) {
      if (Array.isArray(sowData.pricing_roles)) {
        pricingRoles = sowData.pricing_roles;
      } else if (typeof sowData.pricing_roles === 'object' && sowData.pricing_roles && 'roles' in sowData.pricing_roles && Array.isArray(sowData.pricing_roles.roles)) {
        pricingRoles = sowData.pricing_roles.roles;
      } else {
        pricingRoles = this.parseJSONField(sowData.pricing_roles, []);
      }
    }
    
    // Filter out Project Manager role if PM hours are removed
    if (sowData.pm_hours_requirement_disabled) {
      pricingRoles = pricingRoles.filter(role => role.role !== 'Project Manager');
    }
    

    const billingInfo = this.parseJSONField(sowData.billing_info, {} as BillingInfo);
    
    // Helper function to replace placeholders in content
    const replacePlaceholders = (content: string) => {
      return content
        .replace(/\{clientName\}/g, `<strong>${clientName}</strong>`)
        .replace(/\{CLIENT_NAME\}/g, `<strong>${clientName}</strong>`)
        .replace(/\{ClientName\}/g, `<strong>${clientName}</strong>`);
    };
    
    // Use custom content fields when available, fallback to basic fields
    const introContent = replacePlaceholders(sowData.custom_intro_content || sowData.objectives_description || 'Project introduction and overview content will be defined during the project planning phase.');
    const scopeContent = replacePlaceholders(sowData.custom_scope_content || 'Project scope and deliverables will be detailed during the project kickoff and requirements gathering phase.');
    const outOfScopeContent = replacePlaceholders(sowData.custom_out_of_scope_content || '');
    const assumptionsContent = replacePlaceholders(sowData.custom_assumptions_content || 'Project assumptions and prerequisites will be documented during the project planning phase.');
    const projectPhasesContent = replacePlaceholders(sowData.custom_project_phases_content || 'Project phases, activities, and artifacts will be detailed in the project plan developed during kickoff.');
    const rolesContent = replacePlaceholders(sowData.custom_roles_content || 'Roles and responsibilities will be defined during the project planning phase based on the specific requirements of this engagement.');
    const deliverablesContent = replacePlaceholders(sowData.custom_deliverables_content || 'Project deliverables will be detailed during the project planning phase based on the specific requirements and scope.');
    const keyObjectivesContent = replacePlaceholders(sowData.custom_objectives_disclosure_content || sowData.custom_key_objectives_content || 'Key objectives and success criteria will be defined during the project kickoff and planning phase.');
    
    // Get template data for LeanData signatory
    const leanDataName = sowData.template?.lean_data_name || sowData.leandata_name || 'None Selected';
    const leanDataTitle = sowData.template?.lean_data_title || sowData.leandata_title || 'None Selected';
    const leanDataEmail = sowData.template?.lean_data_email || sowData.leandata_email || 'None Selected';
    
    // Create a proper project overview from available data
    const projectOverview = replacePlaceholders(sowData.project_description || 
                           sowData.objectives_description || 
                           `Project overview and objectives will be defined during the project planning phase based on the specific requirements and goals of this engagement.`);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            
            .content-page {
              padding: 20px 40px;
              box-sizing: border-box;
            }
            

            
            .title-page {
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-height: 100vh;
              padding: 20px 40px;
              box-sizing: border-box;
            }
            
            .logo {
              width: 120px;
              height: 60px;
              margin: 0 auto 24px;
            }
            
            .delivery-methodology {
              font-size: 18px;
              color: #6B7280;
              font-weight: 500;
              margin-bottom: 40px;
            }
            
            .main-title {
              font-size: 48px;
              font-weight: 700;
              color: #111827;
              margin: 0 0 16px 0;
              line-height: 1.2;
            }
            
            .client-subtitle {
              font-size: 20px;
              color: #6B7280;
              margin-bottom: 48px;
            }
            
            .client-name {
              color: #111827;
              font-weight: 600;
            }
            
            .client-logo {
              width: 120px;
              height: 60px;
              margin: 0 auto 48px;
            }
            
            .signature-section {
              margin-top: 60px;
              text-align: left;
            }
            
            .signature-item {
              margin-bottom: 40px;
            }
            
            .signature-text {
              font-size: 16px;
              color: #374151;
              margin-bottom: 16px;
              font-weight: 500;
            }
            
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              align-items: start;
            }
            
            .signature-line {
              width: 100%;
              height: 2px;
              background-color: #000;
              margin-bottom: 16px;
            }
            
            .signature-info {
              font-size: 14px;
              line-height: 1.4;
            }
            
            .signature-info.left {
              text-align: left;
            }
            
            .signature-info.center {
              text-align: center;
            }
            
            .section-title {
              font-size: 24px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 16px;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 8px;
            }
            
            .section-title.center {
              text-align: center;
            }
            
            .content {
              margin-bottom: 16px;
            }
            
            .content h3 {
              font-size: 18px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 16px;
            }
            
            .content p {
              margin-bottom: 16px;
              line-height: 1.6;
            }
            
            .content ul {
              margin-bottom: 16px;
              padding-left: 24px;
            }
            
            .content li {
              margin-bottom: 8px;
              line-height: 1.6;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }
            
            th, td {
              border: 1px solid #D1D5DB;
              padding: 12px;
              text-align: left;
              vertical-align: top;
            }
            
            th {
              background-color: #F3F4F6;
              font-weight: 600;
              color: #374151;
            }
            
            .billing-info {
              background-color: #F9FAFB;
              padding: 24px;
              border-radius: 8px;
              margin-top: 16px;
            }
            
            .billing-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-top: 16px;
            }
            
            .billing-label {
              font-size: 14px;
              color: #6B7280;
              margin-bottom: 4px;
            }
            
            .billing-value {
              font-weight: 500;
              color: #111827;
            }
            
            .payment-terms {
              margin-top: 16px;
              padding-top: 16px;
              border-top: 1px solid #E5E7EB;
              font-size: 14px;
              color: #6B7280;
            }
            
            .pricing-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #E5E7EB;
            }
            
            .role-name {
              font-weight: 600;
              color: #111827;
            }
            

          </style>
        </head>
        <body>
          <!-- PAGE 1: TITLE PAGE WITH SIGNATURES -->
          <div class="content-page">
            <div class="title-page">
              <!-- LeanData Logo -->
              <div class="logo" style="margin-bottom: 24px;">
                ${leanDataLogoBase64 ? 
                  `<img src="${leanDataLogoBase64}" alt="LeanData Logo" style="width: 120px; height: 60px; object-fit: contain;">` :
                  `<div style="width: 120px; height: 60px; background: #1F2937; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border-radius: 8px;">LEANDATA</div>`
                }
              </div>
              
              <!-- LeanData Delivery Methodology -->
              <div class="delivery-methodology" style="margin-bottom: 40px;">LeanData Delivery Methodology</div>
              
              <!-- Statement of Work Heading -->
              <div>
                <h1 class="main-title">Statement of Work</h1>
                <div class="client-subtitle">
                  prepared for <span class="client-name">${clientName}</span>
                </div>
              </div>
              
              <!-- Optional Client Logo -->
              ${companyLogo && companyLogo.trim().length > 0 ? `
              <div class="client-logo" style="display: flex; justify-content: center; align-items: center; margin: 0 0 20px 0; border: 2px solid white; width: 100%;">
                <img src="${companyLogo}" alt="${clientName} Logo" style="width: 240px; height: 120px; object-fit: contain;">
              </div>
              ` : ''}
              
              <!-- Signature Section -->
              <div class="signature-section">
                <!-- Client Signature -->
                <div class="signature-item">
                  <p class="signature-text">This SOW is accepted by ${clientName}:<br /><br /><br /></p>
                  <div class="signature-grid">
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info left">
                        <strong>${sowData.client_signer_name || 'Client Representative'}</strong><br>
                        ${sowData.client_title || 'Title'}<br>
                        ${sowData.client_email || 'Email'}
                      </div>
                    </div>
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info text-left">DATE<br><br><br></div>
                    </div>
                  </div>
                </div>
                
                <!-- Second Client Signature (if provided) -->
                ${sowData.customer_signature_name_2 ? `
                <div class="signature-item">
                  <div class="signature-grid">
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info left">
                        <strong>${sowData.customer_signature_name_2}</strong><br>
                        ${sowData.customer_signature_2 || 'Title'}<br>
                        ${sowData.customer_email_2 || 'Email'}
                      </div>
                    </div>
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info text-left">DATE<br><br></div>
                    </div>
                  </div>
                </div>
                ` : ''}
                
                <!-- LeanData Signature -->
                <div class="signature-item">
                  <p class="signature-text">This SOW is accepted by LeanData, Inc.:<br /><br /><br /></p>
                  <div class="signature-grid">
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info left">
                        <strong>${leanDataName}</strong><br>
                        ${leanDataTitle}<br>
                        ${leanDataEmail}
                      </div>
                    </div>
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info left">DATE<br><br></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PAGE 2: SOW INTRO -->
          <div class="content-page">
            <h2 class="section-title center">LEANDATA, INC. STATEMENT OF WORK</h2>
            <div class="content">
              ${introContent}
            </div>
          </div>

          <!-- PAGE 3: OBJECTIVES -->
          <div class="content-page">
            <h2 class="section-title">1. OBJECTIVE</h2>
            
            <!-- Project Overview Section -->
            <div class="content">
              <h3>Objective:</h3>
              <p>${projectOverview}</p>
            </div>
            
            <!-- Key Objectives Section -->
            <div class="content">
              <h3>Key Objectives:</h3>
              ${objectives && objectives.length > 0 ? `
              <ul style="margin: 0; padding-left: 24px; list-style-type: disc;">
                ${objectives.map((objective: string) => {
                  const trimmedObjective = objective.trim();
                  if (!trimmedObjective) return '';
                  return `<li style="margin-bottom: 8px; color: #374151;">${trimmedObjective}</li>`;
                }).join('')}
              </ul>
              ` : `
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; color: #6b7280;">
                <strong>Key Objectives</strong><br>
                Key objectives will be defined during the project kickoff and planning phase based on the specific requirements and goals of this engagement.
              </div>
              `}
            </div>
            
            <!-- Project Details Section -->
            <div class="content">
              <p>The following are the high-level details as part of the implementation:</p>
              <ul>
                ${sowData.products && Array.isArray(sowData.products) && sowData.products.length > 0 ? `
                <li>
                  <strong>Products:</strong>
                  <ul>
                    ${sortProducts(sowData.products).map((product: string) => `<li>${product}</li>`).join('')}
                  </ul>
                </li>
                ` : ''}
                <li>Regions/Business Units: ${sowData.regions || 'N/A'}</li>
                <li>Salesforce Tenants: ${sowData.salesforce_tenants || 'N/A'}</li>
                <li>Timeline: ${sowData.timeline_weeks ? `${sowData.timeline_weeks} weeks` : 'N/A'}</li>
                <li>Start and End date: The start date of this SOW is one week after subscription start date and ends based on the number of weeks</li>
                <li>Units consumption: ${sowData.units_consumption || 'N/A'}</li>
              </ul>
              
              <!-- Product Units Breakdown -->
              ${(sowData.orchestration_units || sowData.bookit_forms_units || sowData.bookit_links_units || sowData.bookit_handoff_units || sowData.number_of_units) ? `
              <div style="margin-top: 24px;">
                <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Product Units:</h4>
                <ul>
                  ${sowData.orchestration_units ? `<li><strong>Orchestration Units:</strong> ${sowData.orchestration_units}</li>` : ''}
                  ${sowData.bookit_forms_units ? `<li><strong>BookIt for Forms Units:</strong> ${sowData.bookit_forms_units}</li>` : ''}
                  ${sowData.bookit_links_units ? `<li><strong>BookIt Links Units:</strong> ${sowData.bookit_links_units}</li>` : ''}
                  ${sowData.bookit_handoff_units ? `<li><strong>BookIt Handoff Units:</strong> ${sowData.bookit_handoff_units}</li>` : ''}
                </ul>
              </div>
              ` : ''}
            </div>
            
            <!-- Objectives Disclosure Content -->
            ${keyObjectivesContent ? `
            <div class="content">
              ${keyObjectivesContent}
            </div>
            ` : ''}
          </div>

          <!-- PAGE 4: SCOPE -->
          <div class="content-page">
            <h2 class="section-title">2. SCOPE</h2>
            
            <!-- Scope content -->
            <div class="content">
              ${scopeContent}
            </div>
            
            <!-- Deliverables content -->
            <div class="content">
              ${deliverablesContent}
            </div>
            
            <!-- Out of Scope content -->
            ${outOfScopeContent ? `
            <div class="content">
              <h3>Out of Scope</h3>
              ${outOfScopeContent}
            </div>
            ` : ''}
          </div>

          <!-- PAGE 5: PROJECT PHASES -->
          <div class="content-page">
            <h2 class="section-title">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
            <div class="content">
              ${projectPhasesContent}
            </div>
          </div>

          <!-- PAGE 6: ROLES AND RESPONSIBILITIES -->
          <div class="content-page">
            <h2 class="section-title">4. ROLES AND RESPONSIBILITIES</h2>
            
            <!-- LeanData Roles -->
            <div class="content">
              <h3>LeanData Roles</h3>
              ${rolesContent}
            </div>
            
            <!-- Client Roles Table -->
            ${clientRoles && clientRoles.length > 0 ? `
            <div class="content">
              <h3>Client Roles</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Role (Title)</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Name</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Email</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Responsibilities</th>
                  </tr>
                </thead>
                <tbody>
                  ${clientRoles.map((role: { role?: string; contact_title?: string; name?: string; email?: string; responsibilities?: string }) => `
                    <tr>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.role || role.contact_title || 'N/A'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.name || 'N/A'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.email || 'N/A'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.responsibilities || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
          </div>

          <!-- PAGE 7: PRICING -->
          <div class="content-page">
            <h2 class="section-title">5. PRICING</h2>
            
            <!-- Project Timeline -->
            ${sowData.timeline_weeks ? `
            <div class="content">
              <h3>Project Timeline</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Phase</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Description</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">1. ENGAGE</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Project kickoff and planning</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125) < 1 ? 'day' : 'days'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">2. DISCOVERY</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Requirements gathering and analysis</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.25)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.25) < 1 ? 'day' : 'days'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">3. BUILD</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Solution development and configuration</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.25)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.25) < 1 ? 'day' : 'days'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">4. TEST</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Quality assurance and validation</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125) < 1 ? 'day' : 'days'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">5. DEPLOY</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Production deployment and go-live</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125) < 1 ? 'day' : 'days'}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">6. HYPERCARE</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Post-deployment support and transition</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125)} ${Math.ceil((parseFloat(sowData.timeline_weeks) || 0) * 0.125) < 1 ? 'day' : 'days'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <!-- Pricing Introduction -->
            <div class="content">
              <p>The tasks above will be completed on a time and material basis, using the LeanData standard workday of 8 hours for a duration of <strong>${sowData.timeline_weeks || 'X'} weeks</strong>.</p>
              <p>Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.</p>
            </div>
            

            

            
            <!-- Pricing Roles -->
            ${pricingRoles && pricingRoles.length > 0 ? `
            <div class="content">
              <h3>Pricing Roles</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Role</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Rate/Hr</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Total Hours</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${pricingRoles.map((role: PricingRole) => `
                    <tr>
                      <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 600;">${role.role || role.name || 'N/A'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">$${(role.ratePerHour || role.rate_per_hour || 0).toFixed(2)}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.totalHours || role.total_hours || 0}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 600;">$${(role.ratePerHour || role.rate_per_hour || 0) * (role.totalHours || role.total_hours || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <!-- Pricing Summary -->
              ${sowData.pricing_total ? `
              <div style="margin-top: 16px;">
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Pricing Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Subtotal</div>
                    <div style="font-size: 20px; font-weight: 700; color: #111827;">$${(sowData.pricing_subtotal || 0).toLocaleString()}</div>
                  </div>
                  ${sowData.pricing_discount && sowData.pricing_discount_type && sowData.pricing_discount_type !== 'none' ? `
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Discount</div>
                    <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${sowData.pricing_discount_type === 'percentage' ? `-${sowData.pricing_discount_percentage || 0}%` : `-$${(sowData.pricing_discount || 0).toLocaleString()}`}</div>
                  </div>
                  ` : ''}
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Total Amount</div>
                    <div style="font-size: 20px; font-weight: 700; color: #059669;">$${((sowData.pricing_subtotal || 0) - (sowData.pricing_discount_type && sowData.pricing_discount_type !== 'none' ? (sowData.pricing_discount || 0) : 0)).toLocaleString()}</div>
                  </div>
                </div>
                
                <!-- Contractual Terms -->
                <div style="margin-top: 16px;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;">
                    LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.
                  </p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                    Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. Additional hours will be billed at the Rate/Hr.
                  </p>
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            <!-- Billing Information -->
            <div class="content">
              <h3>Billing Information</h3>
              <div class="billing-info">
                <div class="billing-grid">
                  <div>
                    <div class="billing-label">Company Name:</div>
                    <div class="billing-value">${billingInfo?.company_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="billing-label">Billing Contact Name:</div>
                    <div class="billing-value">${billingInfo?.billing_contact || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="billing-label">Billing Address:</div>
                    <div class="billing-value">${billingInfo?.billing_address || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="billing-label">Billing Email:</div>
                    <div class="billing-value">${billingInfo?.billing_email || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="billing-label">Purchase Order Number:</div>
                    <div class="billing-value">${billingInfo?.po_number || 'PO provided by customer'}</div>
                  </div>
                  <div>
                    <div class="billing-label">Payment Terms:</div>
                    <div class="billing-value">Net 30</div>
                  </div>
                  <div>
                    <div class="billing-label">Currency:</div>
                    <div class="billing-value">USD</div>
                  </div>
                </div>
                <div class="payment-terms">
                  Payment Terms: Net 30 • Currency: USD • Billing Cycle: Monthly or upon completion of major milestones
                </div>
              </div>
            </div>
          </div>

          <!-- PAGE 8: ASSUMPTIONS -->
          <div class="content-page">
            <h2 class="section-title">6. ASSUMPTIONS</h2>
            <div class="content">
              ${assumptionsContent}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Helper method to parse deliverables (TEXT field with newlines)
  private parseDeliverables(field: string | string[] | null | undefined): string[] {
    if (!field) return [];
    
    if (typeof field === 'string') {
      // Split by newlines and filter out empty lines
      return field.split('\n').filter(line => line.trim().length > 0);
    }
    
    if (Array.isArray(field)) {
      return field;
    }
    
    return [];
  }

  // Helper method to safely parse JSONB fields
  private parseJSONField<T>(field: unknown, defaultValue: T): T {
    if (!field) return defaultValue;
    
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return defaultValue;
      }
    }
    
    if (typeof field === 'object') {
      return field as T;
    }
    
    return defaultValue;
  }

  // Helper method to parse objectives that might be stored as HTML
  private parseObjectivesInternal(field: unknown): string[] {
    return parseObjectives(field);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
