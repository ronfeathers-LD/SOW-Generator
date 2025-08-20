import puppeteer, { Browser } from 'puppeteer';

interface SOWData {
  id: string;
  sow_title?: string;
  client_name?: string;
  company_logo?: string;
  client_signer_name?: string;
  client_title?: string;
  client_email?: string;
  signature_date?: string;
  deliverables?: string;
  objectives_description?: string;
  objectives_key_objectives?: string[];
  content?: string;
  client_roles?: string;
  pricing_roles?: string;
  billing_info?: string;
  start_date?: string;
  timeline_weeks?: string;
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
  template?: {
    name?: string;
    description?: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    client_address?: string;
    client_city?: string;
    client_state?: string;
    client_zip?: string;
    client_country?: string;
  };
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
}

export class PDFGenerator {
  private browser: Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async generateSOWPDF(sowData: SOWData): Promise<Uint8Array> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // Generate HTML content for the SOW
      const htmlContent = this.generateSOWHTML(sowData);
      
      // Set content and wait for any dynamic content to load
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
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
      
      return new Uint8Array(pdfBuffer);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  private generateSOWHTML(sowData: SOWData): string {
    const title = sowData.sow_title || 'Untitled SOW';
    const clientName = sowData.client_name || 'Unknown Client';
    const companyLogo = sowData.company_logo || '';
    
    // Parse JSONB fields safely
    const objectives = this.parseJSONField(sowData.objectives_key_objectives, []);
    const clientRoles = this.parseJSONField(sowData.client_roles, []);
    const pricingRoles = this.parseJSONField(sowData.pricing_roles, []);
    const billingInfo = this.parseJSONField(sowData.billing_info, {} as {
      company_name?: string;
      billing_contact?: string;
      billing_address?: string;
      billing_email?: string;
      po_number?: string;
    });
    
    // Use custom content fields when available, fallback to basic fields
    const introContent = sowData.custom_intro_content || sowData.objectives_description || 'ERROR - No Content Found for Introduction';
    const scopeContent = sowData.custom_scope_content || 'ERROR - No Content Found for Scope';
    const outOfScopeContent = sowData.custom_out_of_scope_content || '';
    const assumptionsContent = sowData.custom_assumptions_content || 'ERROR - No Content Found for Assumptions';
    const projectPhasesContent = sowData.custom_project_phases_content || 'ERROR - No Content Found for Project Phases';
    const rolesContent = sowData.custom_roles_content || 'ERROR - No Content Found for Roles and Responsibilities';
    const deliverablesContent = sowData.custom_deliverables_content || 'ERROR - No Content Found for Deliverables';
    const keyObjectivesContent = sowData.custom_objectives_disclosure_content || sowData.custom_key_objectives_content || 'ERROR - No Content Found for Key Objectives';
    
    // Get template data
    const leanDataName = sowData.leandata_name || 'Agam Vasani';
    const leanDataTitle = sowData.leandata_title || 'VP Customer Success';
    const leanDataEmail = sowData.leandata_email || 'agam.vasani@leandata.com';
    
    // Create a proper project overview from available data
    const projectOverview = sowData.project_description || 
                           sowData.objectives_description || 
                           `ERROR - No Content Found for Project Overview`;

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
              page-break-after: always;
              padding: 40px;
              min-height: 100vh;
              box-sizing: border-box;
            }
            
            .title-page {
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-height: 100vh;
              padding: 40px;
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
              margin-bottom: 24px;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 8px;
            }
            
            .section-title.center {
              text-align: center;
            }
            
            .content {
              margin-bottom: 24px;
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
            
            @media print {
              .content-page {
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1: TITLE PAGE WITH SIGNATURES -->
          <div class="content-page">
            <div class="title-page">
              <!-- LeanData Logo -->
              <div class="logo" style="margin-bottom: 24px;">
                <div style="width: 100%; height: 100%; background: #1F2937; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border-radius: 8px;">
                  LEANDATA
                </div>
              </div>
              
              <!-- LeanData Delivery Methodology -->
              <div class="delivery-methodology" style="margin-bottom: 40px;">LeanData Delivery Methodology</div>
              
              <!-- Statement of Work Heading -->
              <div style="margin-bottom: 48px;">
                <h1 class="main-title">Statement of Work</h1>
                <div class="client-subtitle">
                  prepared for <span class="client-name">${clientName}</span>
                </div>
              </div>
              
              <!-- Optional Client Logo -->
              ${companyLogo ? `
              <div class="client-logo">
                <div style="width: 100%; height: 100%; background: #F3F4F6; color: #6B7280; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 2px dashed #D1D5DB; border-radius: 8px;">
                  ${clientName} LOGO
                </div>
              </div>
              ` : ''}
              
              <!-- Signature Section -->
              <div class="signature-section">
                <!-- Client Signature -->
                <div class="signature-item">
                  <p class="signature-text">This SOW is accepted by ${clientName}:</p>
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
                      <div class="signature-info center">DATE<br><br><br></div>
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
                      <div class="signature-info center">DATE<br><br></div>
                    </div>
                  </div>
                </div>
                ` : ''}
                
                <!-- LeanData Signature -->
                <div class="signature-item">
                  <p class="signature-text">This SOW is accepted by LeanData, Inc.:</p>
                  <div class="signature-grid">
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info left">
                        ${leanDataName}, ${leanDataTitle}<br>
                        ${leanDataEmail}
                      </div>
                    </div>
                    <div>
                      <div class="signature-line"></div>
                      <div class="signature-info center">DATE<br><br></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PAGE 2: SOW INTRO -->
          <div class="content-page">
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
            ${objectives && objectives.length > 0 ? `
            <div class="content">
              <h3>Key Objectives:</h3>
              <div class="text-gray-700 leading-relaxed">
                ${objectives.map((objective: string) => {
                  const trimmedObjective = objective.trim();
                  if (!trimmedObjective) return '';
                  return `<div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                    <span style="color: #9CA3AF; margin-right: 8px; margin-top: 4px;">•</span>
                    <span style="flex: 1;">${trimmedObjective}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
            ` : ''}
            
            <!-- Project Details Section -->
            <div class="content">
              <p>The following are the high-level details as part of the implementation:</p>
              <ul>
                ${sowData.products && Array.isArray(sowData.products) && sowData.products.length > 0 ? `
                <li>
                  <strong>Products:</strong>
                  <ul>
                    ${sowData.products.map((product: string) => `<li>${product}</li>`).join('')}
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
              <h3>Deliverables</h3>
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
                  ${clientRoles.map((role: { title?: string; name?: string; email?: string; responsibilities?: string }) => `
                    <tr>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.title || 'N/A'}</td>
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
            
            <!-- Pricing Introduction -->
            <div class="content">
              <p>The tasks above will be completed on a time and material basis, using the LeanData standard workday of 8 hours for a duration of <strong>${sowData.timeline_weeks || 'X'} weeks</strong>.</p>
              <p>Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.</p>
            </div>
            
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
                    <td style="border: 1px solid #d1d5db; padding: 12px;">1 week</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">2. DISCOVERY</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Requirements gathering and analysis</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">2 weeks</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">3. BUILD</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Solution development and configuration</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">2 weeks</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">4. TEST</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Quality assurance and validation</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">1 week</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">5. DEPLOY</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Production deployment and go-live</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">1 week</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">6. HYPERCARE</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Post-deployment support and transition</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">1 week</td>
                  </tr>
                </tbody>
              </table>
            </div>
            ` : ''}
            
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
                  ${pricingRoles.map((role: { role?: string; ratePerHour?: number; totalHours?: number }) => `
                    <tr>
                      <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 600;">${role.role || 'N/A'}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">$${(role.ratePerHour || 0).toFixed(2)}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px;">${role.totalHours || 0}</td>
                      <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 600;">$${(role.ratePerHour || 0) * (role.totalHours || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <!-- Billing Information -->
            <div class="content">
              <h3>Billing Information</h3>
              <div class="billing-info">
                <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">From Salesforce</h4>
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

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
