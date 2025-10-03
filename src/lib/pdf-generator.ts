import puppeteer, { Browser } from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { parseObjectives } from './utils/parse-objectives';
import { sortProducts, resolveProductNames } from './utils/productSorting';
import { processContent } from './text-to-html';

// Interface for change order data used in PDF generation
interface ChangeOrderPDFData {
  change_order_number: string;
  change_number: number;
  change_requestor: string;
  change_categories: string[];
  reason_for_change: string;
  change_description: string;
  project_name: string;
  client_signer_name: string;
  client_signer_title: string;
  client_signer_email: string;
  leandata_signer_name: string;
  leandata_signer_title: string;
  leandata_signer_email: string;
  order_form_date: string | Date | null;
  associated_po: string;
  pricing_roles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
  total_change_amount?: number;
  sow?: {
    client_name?: string;
  };
}

/**
 * Get LeanData logo URL for PDF generation
 * Using direct blob storage URL for better reliability
 */
function getLeanDataLogoUrl(): string {
  // Use the direct blob storage URL that works in both development and production
  return 'https://tlxeqgk0yr1ztnva.public.blob.vercel-storage.com/rte-images/1758909456734-katoxspoked.png';
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
  description?: string;
  ratePerHour?: number;
  defaultRate?: number;
  totalHours?: number;
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

  /**
   * Diagnostic function to check PDF generation environment
   */
  async diagnoseEnvironment(): Promise<{
    environment: string;
    memoryUsage: number;
    chromiumAvailable: boolean;
    chromiumPath?: string;
    puppeteerAvailable: boolean;
    systemInfo: any;
  }> {
    const diagnostics = {
      environment: process.env.NODE_ENV || 'unknown',
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      chromiumAvailable: false,
      chromiumPath: undefined as string | undefined,
      puppeteerAvailable: false,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.round(process.uptime()),
        totalMemory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        externalMemory: Math.round(process.memoryUsage().external / 1024 / 1024),
        rssMemory: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    };

    try {
      // Check if chromium is available
      diagnostics.chromiumPath = await chromium.executablePath();
      diagnostics.chromiumAvailable = true;
      console.log('✅ Chromium is available at:', diagnostics.chromiumPath);
    } catch (error) {
      console.warn('⚠️ Chromium not available:', error);
    }

    try {
      // Check if puppeteer is available
      const puppeteer = await import('puppeteer');
      diagnostics.puppeteerAvailable = true;
      console.log('✅ Puppeteer is available');
    } catch (error) {
      console.warn('⚠️ Puppeteer not available:', error);
    }

    return diagnostics;
  }

  async initialize() {
    if (!this.browser) {
      const initStartTime = Date.now();
      console.log('🔧 Starting browser initialization...');
      console.log(`💾 Initial memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      
      try {
        if (process.env.NODE_ENV === 'production') {
          // Use Vercel-optimized approach for production
          console.log('🚀 Launching Vercel-optimized Chromium...');
          console.log('📋 Using chromium args:', chromium.args);
          
          const executablePath = await chromium.executablePath();
          console.log('📁 Chromium executable path:', executablePath);
          
          const browserStartTime = Date.now();
          this.browser = await puppeteerCore.launch({
            args: [
              ...chromium.args,
              // Core serverless flags
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              // Memory optimization
              '--max_old_space_size=128',
              '--memory-pressure-off',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              // Disable unnecessary features
              '--disable-extensions',
              '--disable-plugins',
              '--disable-default-apps',
              '--disable-javascript',
              '--disable-images',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor,TranslateUI',
              '--disable-ipc-flooding-protection',
              '--disable-hang-monitor',
              '--disable-prompt-on-repost',
              '--disable-domain-reliability',
              '--disable-component-extensions-with-background-pages',
              '--disable-background-networking',
              '--disable-sync',
              '--disable-translate',
              '--mute-audio',
              '--no-default-browser-check',
              '--no-pings',
              '--disable-logging',
              '--disable-permissions-api',
              // Additional memory savings
              '--disable-client-side-phishing-detection',
              '--disable-component-update',
              '--disable-extensions-file-access-check',
              '--disable-extensions-http-throttling',
              '--disable-features=BlinkGenPropertyTrees',
              '--disable-field-trial-config',
              '--disable-back-forward-cache',
              '--force-color-profile=srgb',
              '--metrics-recording-only',
              '--use-mock-keychain'
            ],
            defaultViewport: { width: 800, height: 1000 },
            executablePath: executablePath,
            headless: true,
            timeout: 30000,
            ignoreDefaultArgs: ['--disable-extensions'],
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
          });
          
          const browserTime = Date.now() - browserStartTime;
          const totalTime = Date.now() - initStartTime;
          console.log(`✅ Vercel-optimized Chromium launched successfully in ${browserTime}ms (total: ${totalTime}ms)`);
          console.log(`💾 Memory after browser launch: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
          
          // Add browser event listeners for debugging
          this.browser.on('disconnected', () => {
            console.warn('⚠️ Browser disconnected unexpectedly');
          });
          
          this.browser.on('targetdestroyed', (target: any) => {
            console.warn('⚠️ Browser target destroyed:', target.url());
          });
        } else {
          // Use full puppeteer for local development
          console.log('🚀 Launching full Puppeteer for local development...');
          
          const browserStartTime = Date.now();
          this.browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ],
            timeout: 60000
          });
          
          const browserTime = Date.now() - browserStartTime;
          const totalTime = Date.now() - initStartTime;
          console.log(`✅ Full Puppeteer launched successfully in ${browserTime}ms (total: ${totalTime}ms)`);
          console.log(`💾 Memory after browser launch: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        }
      } catch (error) {
        const totalTime = Date.now() - initStartTime;
        console.error(`❌ Failed to launch browser after ${totalTime}ms:`, error);
        
        // Log detailed error information
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        // Fallback to HTML generation if browser fails
        throw new Error(
          'Failed to launch browser for PDF generation. ' +
          'Falling back to HTML generation for serverless environments.'
        );
      }
    } else {
      console.log('✅ Browser already initialized');
    }
  }

  async generateSOWPDF(sowData: SOWData): Promise<Uint8Array> {
    const startTime = Date.now();
    console.log(`🚀 Starting PDF generation for SOW: ${sowData.id}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    let page: any = null;
    
    try {
      console.log('🔧 Initializing browser...');
      await this.initialize();
      console.log('✅ Browser initialized successfully');
      
      // Sort products for consistent display order and resolve IDs to names
      const productsArray = Array.isArray(sowData.products) ? sowData.products : (sowData.products ? [sowData.products] : []);
      const sortedProducts = productsArray.length > 0 ? await sortProducts(productsArray) : [];
      const resolvedProductNames = sortedProducts.length > 0 ? await resolveProductNames(sortedProducts) : [];
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      console.log('📄 Creating new page...');
      page = await this.browser.newPage();
      console.log('✅ New page created');
      
      // Add page event listeners for debugging
      page.on('error', (error: any) => {
        console.error('🚨 Page error:', error.message);
      });
      
      page.on('pageerror', (error: any) => {
        console.error('🚨 Page script error:', error.message);
      });
      
      page.on('requestfailed', (request: any) => {
        console.warn('⚠️ Request failed:', request.url(), request.failure()?.errorText);
      });
      
      try {
        console.log('📝 Generating HTML content...');
        const htmlContent = this.generateSOWHTML(sowData, resolvedProductNames);
        console.log(`✅ HTML content generated, length: ${htmlContent.length} characters`);
        
        console.log('📋 Setting page content...');
        const contentStartTime = Date.now();
        
        // Set shorter timeout for content loading
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(10000);
        
        await page.setContent(htmlContent, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        const contentTime = Date.now() - contentStartTime;
        console.log(`✅ Page content set successfully in ${contentTime}ms`);
        
        console.log('🖼️ Setting viewport...');
        await page.setViewport({ width: 800, height: 1000 });
        console.log('✅ Viewport set');
        
        console.log('📄 Generating PDF...');
        const pdfStartTime = Date.now();
        
        // Generate PDF with shorter timeout
        const pdfBuffer = await Promise.race([
          page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '0.5in',
              right: '0.5in',
              bottom: '0.5in',
              left: '0.5in'
            },
            // Optimize for smaller file size
            preferCSSPageSize: true,
            displayHeaderFooter: false
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('PDF generation timeout')), 15000)
          )
        ]);
        const pdfTime = Date.now() - pdfStartTime;
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ PDF generated successfully in ${pdfTime}ms (total: ${totalTime}ms)`);
        console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
        console.log(`💾 Final memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        
        return new Uint8Array(pdfBuffer);
        
      } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error(`❌ Error during PDF generation process after ${errorTime}ms:`, error);
        
        // Log detailed error information
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        throw error;
      } finally {
        if (page) {
          try {
            await page.close();
            console.log('✅ Page closed');
          } catch (closeError) {
            console.error('❌ Error closing page:', closeError);
          }
        }
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Fatal error in PDF generation after ${totalTime}ms:`, error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // PDF generation failed - throw error instead of fallback
      console.log('❌ PDF generation failed - no fallback available');
      throw new Error(`PDF generation failed after ${totalTime}ms: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private generateSOWHTML(sowData: SOWData, sortedProducts: string[] = []): string {
    const title = sowData.sow_title || 'Untitled SOW';
    const clientName = sowData.client_name || 'Unknown Client';
    const companyLogo = sowData.company_logo || '';
    const leanDataLogoUrl = getLeanDataLogoUrl();
    

    
    // Parse client roles
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
    
    // Always filter out Account Executive from pricing roles table
    pricingRoles = pricingRoles.filter(role => role.role !== 'Account Executive');
    

    const billingInfo = this.parseJSONField(sowData.billing_info, {} as BillingInfo);
    
    // Helper function to replace placeholders in content
    const replacePlaceholders = (content: string) => {
      return content
        .replace(/\{clientName\}/g, `<strong>${clientName}</strong>`)
        .replace(/\{CLIENT_NAME\}/g, `<strong>${clientName}</strong>`)
        .replace(/\{ClientName\}/g, `<strong>${clientName}</strong>`);
    };
    
    // Process content with nested UL cleanup and placeholder replacement
    const processContentWithPlaceholders = (content: string) => {
      return replacePlaceholders(processContent(content));
    };
    
    // Use custom content fields when available, fallback to basic fields
    const introContent = processContentWithPlaceholders(sowData.custom_intro_content || sowData.objectives_description || 'Project introduction and overview content will be defined during the project planning phase.');
    const scopeContent = processContentWithPlaceholders(sowData.custom_scope_content || 'Project scope and deliverables will be detailed during the project kickoff and requirements gathering phase.');
    const outOfScopeContent = processContentWithPlaceholders(sowData.custom_out_of_scope_content || '');
    const assumptionsContent = processContentWithPlaceholders(sowData.custom_assumptions_content || 'Project assumptions and prerequisites will be documented during the project planning phase.');
    const projectPhasesContent = processContentWithPlaceholders(sowData.custom_project_phases_content || 'Project phases, activities, and artifacts will be detailed in the project plan developed during kickoff.');
    const deliverablesContent = processContentWithPlaceholders(sowData.custom_deliverables_content || 'Project deliverables will be detailed during the project planning phase based on the specific requirements and scope.');
    const keyObjectivesContent = processContentWithPlaceholders(sowData.custom_key_objectives_content || '');
    const objectivesDisclosureContent = processContentWithPlaceholders(sowData.custom_objectives_disclosure_content || '');
    
    // Get template data for LeanData signatory
    const leanDataName = sowData.leandata_name;
    const leanDataTitle = sowData.leandata_title;
    const leanDataEmail = sowData.leandata_email;
    
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
            /* Optimized CSS for smaller PDF size */
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              line-height: 1.5;
              color: #333;
              margin: 0;
              padding: 0;
            }
            
            .content-page {
              padding: 20px 40px;
            }
            
            /* Optimized images */
            img {
              max-width: 100%;
              max-height: 300px;
              height: auto;
              display: block;
              margin: 12px auto;
              border-radius: 4px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .logo img, .client-logo img {
              box-shadow: none;
              border-radius: 0;
              margin: 0;
            }
            
            /* Consolidated table styles - standardized borders */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
              overflow: hidden;
            }
            
            .content-table {
              margin-top: 16px;
            }
            
            .change-order-table {
              margin-bottom: 15px;
              border: 1px solid #ddd;
            }
            
            .content table thead,
            .content table:not(:has(thead)) tbody tr:first-child {
              background-color: #26D07C;
            }
            
            th, .content table:not(:has(thead)) tbody tr:first-child td {
              background-color: #26D07C;
              border: none;
              padding: 8px 12px;
              text-align: left;
              font-weight: 700;
              color: #fff;
              text-transform: uppercase;
              font-size: 11px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            td {
              border: none;
              padding: 10px 12px;
              color: #374151;
              vertical-align: top;
              border-bottom: 1px solid #e5e7eb;
            }
            
            tr:last-child td {
              border-bottom: none;
            }
            
            /* Title page */
            .title-page {
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-height: 100vh;
              padding: 20px 40px;
            }
            
            .logo {
              width: 150px;
              height: 75px;
              margin: 0 auto 24px;
            }
            
            .delivery-methodology {
              font-size: 16px;
              color: #666;
              font-weight: 500;
              margin-bottom: 32px;
            }
            
            .main-title {
              font-size: 42px;
              font-weight: 700;
              color: #111;
              margin: 0 0 12px 0;
              line-height: 1.2;
            }
            
            .client-subtitle {
              font-size: 18px;
              color: #666;
              margin-bottom: 40px;
            }
            
            .client-name {
              color: #111;
              font-weight: 600;
            }
            
            .client-logo {
              width: 100px;
              height: 50px;
              margin: 0 auto 40px;
            }
            
            /* Signatures */
            .signature-section {
              margin-top: 50px;
              text-align: left;
            }
            
            .signature-item {
              margin-bottom: 32px;
            }
            
            .signature-text {
              font-size: 14px;
              color: #374151;
              margin-bottom: 12px;
              font-weight: 500;
            }
            
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
              align-items: start;
            }
            
            .signature-line {
              width: 100%;
              height: 2px;
              background-color: #000;
              margin-bottom: 12px;
            }
            
            .signature-info {
              font-size: 12px;
              line-height: 1.3;
            }
            
            .signature-info.left {
              text-align: left;
            }
            
            .signature-info.center {
              text-align: center;
            }
            
            /* Content sections */
            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #111;
              margin-bottom: 12px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 6px;
            }
            
            .section-title.center {
              text-align: center;
            }
            
            .content {
              margin-bottom: 12px;
            }
            
            .content h3 {
              font-size: 16px;
              font-weight: 600;
              color: #111;
              margin-bottom: 12px;
            }
            
            .content p {
              margin-bottom: 12px;
              line-height: 1.5;
            }
            
            .content ul {
              margin-bottom: 12px;
              padding-left: 20px;
            }
            
            .content li {
              margin-bottom: 6px;
              line-height: 1.5;
            }
            
            /* Billing info */
            .billing-info {
              background-color: #f9f9f9;
              padding: 16px;
              border-radius: 6px;
              margin-top: 12px;
            }
            
            .billing-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 12px;
            }
            
            .billing-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 2px;
            }
            
            .billing-value {
              font-weight: 500;
              color: #111;
            }
            
            .payment-terms {
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1: TITLE PAGE WITH SIGNATURES -->
          <div class="content-page">
            <div class="title-page">
              <!-- LeanData Logo -->
              <div class="logo" style="margin-bottom: 24px;">
                <img src="${leanDataLogoUrl}" alt="LeanData Logo" style="width: 150px; height: 75px; object-fit: contain; box-shadow: none;">
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
                <img src="${companyLogo}" alt="${clientName} Logo" style="width: 200px; height: 100px; object-fit: contain;">
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
                        ${leanDataName && leanDataTitle && leanDataEmail ? `
                          <strong>${leanDataName}</strong><br>
                          ${leanDataTitle}<br>
                          ${leanDataEmail}
                        ` : `
                          <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 12px; margin: 8px 0;">
                            <div style="color: #dc2626; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
                              ⚠️ ERROR: LeanData Signatory Not Configured
                            </div>
                            <div style="color: #991b1b; font-size: 12px; line-height: 1.4;">
                              <strong>CRITICAL:</strong> LeanData signatory information is missing. This SOW cannot be finalized without proper signatory details.
                            </div>
                            <div style="color: #7f1d1d; font-size: 10px; margin-top: 6px; font-style: italic;">
                              Please configure the LeanData signatory in the SOW editor before generating the final PDF.
                            </div>
                          </div>
                        `}
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
              ${keyObjectivesContent || `
              <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <div style="color: #dc2626; font-size: 18px; font-weight: bold; margin-bottom: 12px;">
                  ⚠️ ERROR: Key Objectives Not Configured
                </div>
                <div style="color: #991b1b; font-size: 14px; line-height: 1.5;">
                  <strong>CRITICAL:</strong> Key objectives have not been defined for this SOW. This content must be configured before the SOW can be finalized and sent to the client.
                </div>
                <div style="color: #7f1d1d; font-size: 12px; margin-top: 8px; font-style: italic;">
                  Please configure the Key Objectives content in the SOW editor before generating the final PDF.
                </div>
              </div>
              `}
            </div>
            
            <!-- Project Details Section -->
            <div class="content">
              <p>The following are the high-level details as part of the implementation:</p>
              <ul>
                ${sortedProducts.length > 0 ? `
                <li>
                  <strong>Products:</strong>
                  <ul>
                    ${sortedProducts.map((product: string) => `<li>${product}</li>`).join('')}
                  </ul>
                </li>
                ` : ''}
                ${(() => {
                  const hasMultiGraph = sortedProducts.some(product => 
                    product === 'MultiGraph' || 
                    product.toLowerCase() === 'multigraph'
                  );
                  
                  if (hasMultiGraph) {
                    if (sowData.regions && sowData.regions.trim() !== '') {
                      return `<li>Number of Regions: ${sowData.regions}</li>`;
                    } else {
                      return `<li style="color: #dc2626; font-weight: bold;">⚠️ ERROR: Number of Regions is required for MultiGraph but is missing</li>`;
                    }
                  }
                  return '';
                })()}
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
            ${objectivesDisclosureContent ? `
            <div class="content">
              ${objectivesDisclosureContent}
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
            
            <!-- Project Team Roles -->
            ${pricingRoles && pricingRoles.length > 0 ? `
            <div class="content">
              <h3>Project Team Roles</h3>
              <table class="content-table">
                <thead>
                  <tr style="background-color: #26D07C; color: #ffffff;">
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">LeanData Role</th>
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Responsibilities</th>
                  </tr>
                </thead>
                <tbody>
                  ${pricingRoles.map((role: PricingRole) => `
                    <tr>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; font-weight: 600; color: #111827;">${role.role || role.name || 'N/A'}</td>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151;">${role.description || 'No description provided'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <!-- Client Roles Table -->
            ${clientRoles && clientRoles.length > 0 ? `
            <div class="content">
              <h3>Client Roles</h3>
              <table class="content-table">
                <thead>
                  <tr style="background-color: #26D07C; color: #ffffff;">
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">${clientName} Role</th>
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Contact</th>
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Responsibilities</th>
                  </tr>
                </thead>
                <tbody>
                  ${clientRoles.map((role: { role?: string; contact_title?: string; name?: string; email?: string; responsibilities?: string }) => `
                    <tr>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; font-weight: 600; color: #111827;">${role.role || role.contact_title || 'N/A'}</td>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151;">
                        <div style="font-weight: 500;">${role.name || 'N/A'}</div>
                        ${role.email ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${role.email}</div>` : ''}
                      </td>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151;">${role.responsibilities || 'N/A'}</td>
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
            ${sowData.timeline_weeks && sowData.timeline_weeks !== '999' ? `
            <div class="content">
              <h3>Project Timeline</h3>
              ${(() => {
                const totalWeeks = parseFloat(sowData.timeline_weeks) || 0;
                
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
                
                const phaseDurations = {
                  engage: 0.125, discovery: 0.25, build: 0.25, 
                  test: 0.125, deploy: 0.125, hypercare: 0.125
                };
                
                const phases = [
                  { name: 'ENGAGE', description: 'Project kickoff and planning', duration: totalWeeks * phaseDurations.engage },
                  { name: 'DISCOVERY', description: 'Requirements gathering and analysis', duration: totalWeeks * phaseDurations.discovery },
                  { name: 'BUILD', description: 'Solution development and configuration', duration: totalWeeks * phaseDurations.build },
                  { name: 'TEST', description: 'Quality assurance and validation', duration: totalWeeks * phaseDurations.test },
                  { name: 'DEPLOY', description: 'Production deployment and go-live', duration: totalWeeks * phaseDurations.deploy },
                  { name: 'HYPERCARE', description: 'Post-deployment support and transition', duration: totalWeeks * phaseDurations.hypercare }
                ];
                
                return `
                  <table class="content-table">
                    <thead>
                      <tr style="background-color: #26D07C; color: #ffffff;">
                        <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Phase</th>
                        <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Description</th>
                        <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${phases.map((phase, index) => `
                        <tr>
                          <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: top;">${index + 1}. ${phase.name}</td>
                          <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: top;">${phase.description}</td>
                          <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: top;">${formatDuration(phase.duration)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `;
              })()}
            </div>
            ` : `
            <div class="content">
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; color: #dc2626;">
                <strong>Project Timeline Required</strong><br>
                Please set the project timeline in the Project Overview tab before generating the PDF.
              </div>
            </div>
            `}
            
            <!-- Pricing Introduction -->
            <div class="content">
              <p>The tasks above will be completed on a time and material basis, using the LeanData standard workday of 8 hours for a duration of <strong>${sowData.timeline_weeks || 'X'} weeks</strong>.</p>
              <p>Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.</p>
            </div>
            

            

            
            <!-- Pricing Roles -->
            ${pricingRoles && pricingRoles.length > 0 ? `
            <div class="content">
              <h3>Pricing Roles</h3>
              <table class="content-table">
                <thead>
                  <tr style="background-color: #26D07C; color: #ffffff;">
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Role</th>
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">${pricingRoles.some(role => (role.defaultRate || 0) > 0 && (role.defaultRate || 0) !== (role.ratePerHour || 0)) ? 'Standard Rate/Hr' : 'Rate/Hr'}</th>
                    ${pricingRoles.some(role => (role.defaultRate || 0) > 0 && (role.defaultRate || 0) !== (role.ratePerHour || 0)) ? '<th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Discounted Rate/Hr</th>' : ''}
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Total Hours</th>
                    <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    // Filter out Account Executive and Project Manager if PM hours are removed
                    const filteredPricingRoles = pricingRoles.filter(role => {
                      if (role.role === 'Account Executive') return false;
                      if (sowData.pm_hours_requirement_disabled && role.role === 'Project Manager') return false;
                      return true;
                    });

                    if (filteredPricingRoles.length === 0) return '';

                    const hasAnyDiscount = filteredPricingRoles.some(r => (r.defaultRate || 0) > 0 && (r.defaultRate || 0) !== (r.ratePerHour || 0));
                    
                    // Group roles by their rates to avoid duplication
                    const rateGroups = filteredPricingRoles.reduce((groups: Record<string, { roles: string[], hasDiscount: boolean, defaultRate: number, ratePerHour: number }>, role) => {
                      const hasDiscount = (role.defaultRate || 0) > 0 && (role.defaultRate || 0) !== (role.ratePerHour || 0);
                      const rateKey = hasDiscount ? `${role.defaultRate}-${role.ratePerHour}` : `${role.ratePerHour}`;
                      
                      if (!groups[rateKey]) {
                        groups[rateKey] = {
                          roles: [],
                          hasDiscount,
                          defaultRate: role.defaultRate || 0,
                          ratePerHour: role.ratePerHour || 0
                        };
                      }
                      groups[rateKey].roles.push(role.role || role.name || 'N/A');
                      return groups;
                    }, {});

                    return `
                    <tr>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; font-weight: 600; vertical-align: middle; text-align: center; height: 80px; white-space: nowrap;">
                        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                          ${filteredPricingRoles.map(role => `<div style="white-space: nowrap;">${role.role || role.name || 'N/A'}</div>`).join('')}
                        </div>
                      </td>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: middle; text-align: center; height: 80px;">
                        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                          ${Object.values(rateGroups).map(group => `
                            <div>
                              ${group.hasDiscount ? 
                                `<span style="text-decoration: line-through; color: #6b7280;">$${group.defaultRate.toFixed(2)}</span>` : 
                                `$${group.ratePerHour.toFixed(2)}`
                              }
                            </div>
                          `).join('')}
                        </div>
                      </td>
                      ${hasAnyDiscount ? `
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: middle; text-align: center; height: 80px;">
                        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                          ${Object.values(rateGroups).map(group => `
                            <div>
                              ${group.hasDiscount ? 
                                `<span style="color: #059669; font-weight: 600;">$${group.ratePerHour.toFixed(2)}</span>` : 
                                `<span style="color: #9ca3af;">—</span>`
                              }
                            </div>
                          `).join('')}
                        </div>
                      </td>` : ''}
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; vertical-align: middle; text-align: center; height: 80px;">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                          ${filteredPricingRoles.reduce((sum, role) => sum + (role.totalHours || 0), 0)}
                        </div>
                      </td>
                      <td style="border-bottom: 1px solid #e5e7eb; padding: 16px; color: #374151; font-weight: 600; vertical-align: middle; text-align: center; height: 80px;">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                          $${filteredPricingRoles.reduce((sum, role) => sum + ((role.ratePerHour || 0) * (role.totalHours || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                    `;
                  })()}
                </tbody>
              </table>
              
              <!-- Pricing Summary -->
              ${sowData.pricing_total ? `
              <div style="margin-top: 16px;">
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Pricing Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Subtotal</div>
                    <div style="font-size: 20px; font-weight: 700; color: #111827;">$${(sowData.pricing_subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  ${sowData.pricing_discount && sowData.pricing_discount_type && sowData.pricing_discount_type !== 'none' ? `
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Discount</div>
                    <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${sowData.pricing_discount_type === 'percentage' ? `-${sowData.pricing_discount_percentage || 0}%` : `-$${(sowData.pricing_discount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
                  </div>
                  ` : ''}
                  <div style="background-color: white; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Total Amount</div>
                    <div style="font-size: 20px; font-weight: 700; color: #059669;">$${((sowData.pricing_subtotal || 0) - (sowData.pricing_discount_type && sowData.pricing_discount_type !== 'none' ? (sowData.pricing_discount || 0) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                    <div class="billing-value">${billingInfo?.po_number || 'N/A'}</div>
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

  async generateChangeOrderPDF(changeOrderData: ChangeOrderPDFData): Promise<Uint8Array> {
    // Starting PDF generation for change order: ${changeOrderData.change_order_number}
    
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      // Browser initialized successfully
      const page = await this.browser.newPage();
      // New page created
      
      try {
        // Generate HTML content for the change order
        // Generating HTML content...
        const htmlContent = this.generateChangeOrderHTML(changeOrderData);
        // HTML content generated, length: ${htmlContent.length}
        
        // Set content and wait for any dynamic content to load
        // Setting page content...
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        // Page content set successfully
        
        // Set viewport for consistent rendering (optimized for smaller PDF size)
        await page.setViewport({ width: 800, height: 1000 });
        // Viewport set
        
        // Generate PDF
        // Generating PDF...
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          // Optimize for smaller file size
          preferCSSPageSize: true,
          displayHeaderFooter: false
        });
        
        // PDF generated successfully, size: ${pdfBuffer.length} bytes
        return new Uint8Array(pdfBuffer);
        
      } catch (error) {
        console.error('❌ Error during PDF generation process:', error);
        throw error;
      } finally {
        await page.close();
        // Page closed
      }
      
    } catch (error) {
      console.error('❌ Error in generateChangeOrderPDF:', error);
      throw error;
    }
  }

  private generateChangeOrderHTML(changeOrderData: ChangeOrderPDFData): string {
    const {
      change_order_number,
      change_number,
      change_requestor,
      change_categories,
      reason_for_change,
      change_description,
      project_name,
      client_signer_name,
      client_signer_title,
      client_signer_email,
      leandata_signer_name,
      leandata_signer_title,
      leandata_signer_email,
      order_form_date,
      associated_po,
      pricing_roles,
      total_change_amount,
      sow
    } = changeOrderData;

    // Format dates
    const formatDate = (date: unknown): string => {
      if (!date) return 'N/A';
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      if (date instanceof Date) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return 'N/A';
    };

    // Format order form date
    const formattedOrderFormDate = formatDate(order_form_date);

    // Get client name from SOW
    const clientName = sow?.client_name || 'Customer';

    // Generate change categories display with checkboxes
    const allCategories = ['Schedule', 'Cost', 'Scope', 'Testing (Quality)', 'Resources', 'Artifacts'];
    const categoriesDisplay = allCategories.map((cat: string) => {
      const isChecked = change_categories?.includes(cat) || false;
      return `<div class="category-card ${isChecked ? 'checked' : ''}">
        <span class="category-checkbox ${isChecked ? 'checked' : ''}">
          ${isChecked ? '<span class="category-checkmark">✓</span>' : ''}
        </span>
        ${cat}
      </div>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Order: ${change_order_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.3;
            margin: 0;
            padding: 30px;
            color: #000;
            font-size: 11pt;
        }
        .title {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: left;
        }
        .intro-text {
            margin-bottom: 20px;
            text-align: left;
            font-size: 11pt;
            line-height: 1.4;
        }
        .details-section {
            margin-bottom: 25px;
        }
        .details-section h3 {
            font-size: 11pt;
            font-weight: normal;
            margin-bottom: 10px;
            text-decoration: none;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .details-table td {
            padding: 4px 0;
            border: none;
            vertical-align: top;
            text-align: left;
        }
        .details-table td:first-child {
            font-weight: bold;
            width: 180px;
        }
        .details-table td:last-child {
            padding-left: 10px;
        }
        .change-categories {
            margin-bottom: 25px;
        }
        .change-categories h3 {
            font-size: 11pt;
            font-weight: normal;
            margin-bottom: 8px;
            text-decoration: none;
        }
        .category-item {
            margin-bottom: 6px;
            line-height: 1.4;
        }
        .category-card {
            display: inline-block;
            margin: 4px 8px 4px 0;
            padding: 8px 12px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            background-color: #ffffff;
            font-size: 10pt;
            font-weight: 500;
            color: #374151;
        }
        .category-card.checked {
            background-color: #2563eb;
            border-color: #2563eb;
            color: #ffffff;
        }
        .category-checkbox {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #9ca3af;
            border-radius: 4px;
            margin-right: 8px;
            vertical-align: middle;
            background-color: #ffffff;
        }
        .category-card.checked .category-checkbox {
            background-color: #ffffff;
            border-color: #ffffff;
        }
        .category-checkmark {
            display: inline-block;
            width: 12px;
            height: 12px;
            margin: 2px;
            color: #2563eb;
        }
        .reason-section, .description-section {
            margin-bottom: 25px;
        }
        .reason-section h3, .description-section h3 {
            font-size: 11pt;
            font-weight: normal;
            margin-bottom: 8px;
            text-decoration: none;
        }
        .reason-text, .description-text {
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid #000;
            min-height: 50px;
            background-color: #fff;
            font-size: 11pt;
        }
        .boilerplate-text {
            margin-top: 15px;
            padding: 12px;
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            font-size: 10pt;
            line-height: 1.3;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-block {
            display: inline-block;
            width: 48%;
            vertical-align: top;
            margin-right: 4%;
        }
        .signature-block h3 {
            font-size: 11pt;
            font-weight: normal;
            margin-bottom: 15px;
            text-decoration: none;
        }
        .signature-field {
            margin-bottom: 12px;
        }
        .signature-field label {
            font-weight: bold;
            display: block;
            margin-bottom: 3px;
            font-size: 10pt;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 20px;
            margin-bottom: 6px;
            width: 100%;
        }
        .signature-value {
            font-size: 10pt;
            margin-bottom: 3px;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="title">Change Order : ${change_order_number}</div>

    <div class="intro-text">
        <p>This Change Order ("CO"), is effective as of signature of the document ("CO Effective Date") and is being entered into in accordance with and pursuant to the Order Form by and between <strong>${clientName}</strong>, ("Customer") and <strong>LeanData, Inc.</strong>, ("LeanData"), dated <strong>${formattedOrderFormDate}</strong>, ("Order Form"). The following Change Order defines the additional or change in services.</p>
    </div>

    <div class="details-section">
        <div>The following provides the details of the changes as part of the CO :</div>
        <table class="details-table">
            <tr>
                <td><strong>Project</strong></td>
                <td>${project_name}</td>
            </tr>
            <tr>
                <td><strong>Change Requestor</strong></td>
                <td>${change_requestor}</td>
            </tr>
            <tr>
                <td><strong>Change Number</strong></td>
                <td>${change_number}</td>
            </tr>
            <tr>
                <td><strong>Associated PO</strong></td>
                <td>${associated_po || 'N/A'}</td>
            </tr>
        </table>
    </div>

    <div class="change-categories">
        <h3>Change Category (Select all that apply):</h3>
        <div class="category-item">${categoriesDisplay}</div>
    </div>

    <div class="reason-section">
        <h3>Reason for Change:</h3>
        <div class="reason-text">${reason_for_change}</div>
    </div>

    <div class="description-section">
        <h3>Change Description:</h3>
        <div class="description-text">
            ${change_description}
        </div>
        ${pricing_roles && pricing_roles.length > 0 ? `
        <div class="pricing-section" style="margin-top: 20px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 15px; text-decoration: underline;">Pricing Changes:</h3>
            <table class="change-order-table">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Role</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Rate/Hr</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Hours</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${pricing_roles.map((role) => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${role.role}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">$${role.ratePerHour.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${role.totalHours}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">$${role.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f0f0f0;">
                        <td colspan="3" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right;">Total Change Order Amount:</td>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">$${(total_change_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        ` : ''}
        <div class="boilerplate-text">
            <p>As noted in the Order Form, the allocated effort and hours are valid for a period of 60 days. If the project is not completed by its due date, or if there is change in estimated effort/hours, LeanData will provide the Customer with cost estimates for additional Professional Services Engagement.</p>
        </div>
    </div>

    <div class="signature-section">
        <div class="signature-block">
            <h3>Approved by ${clientName}:</h3>
            <div class="signature-field">
                <label>Name:</label>
                <div class="signature-value">${client_signer_name}, ${client_signer_title}</div>
            </div>
            <div class="signature-field">
                <label>Signature:</label>
                <div class="signature-line"></div>
            </div>
            <div class="signature-field">
                <label>Date:</label>
                <div class="signature-line"></div>
            </div>
            <div class="signature-field">
                <label>Email:</label>
                <div class="signature-value">${client_signer_email}</div>
            </div>
        </div>

        <div class="signature-block">
            <h3>Approved by LeanData, Inc.:</h3>
            <div class="signature-field">
                <label>Name:</label>
                <div class="signature-value">${leandata_signer_name}, ${leandata_signer_title}</div>
            </div>
            <div class="signature-field">
                <label>Signature:</label>
                <div class="signature-line"></div>
            </div>
            <div class="signature-field">
                <label>Date:</label>
                <div class="signature-line"></div>
            </div>
            <div class="signature-field">
                <label>Email:</label>
                <div class="signature-value">${leandata_signer_email}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
