'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWOutOfScopePage from '@/components/sow/SOWOutOfScopePage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import SOWProjectPhasesPage from '@/components/sow/SOWProjectPhasesPage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';
import PricingDisplay from '@/components/sow/PricingDisplay';

interface SOW {
  id: string;
  sowTitle?: string;
  clientName?: string;
  companyLogo?: string;
  clientSignerName?: string;
  clientTitle?: string;
  clientEmail?: string;
  signatureDate?: string;
  deliverables?: string[];
  objectivesDescription?: string;
  objectivesKeyObjectives?: string[];
  content?: string;
  clientRoles?: Array<{
    role: string;
    name: string;
    email: string;
    responsibilities: string;
  }>;
  pricingRoles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
  billingInfo?: {
    companyName: string;
    billingContact: string;
    billingAddress: string;
    billingEmail: string;
    poNumber: string;
    paymentTerms: string;
    currency: string;
  };
  startDate?: string;
  timelineWeeks?: string;
  products?: string[];
  numberOfUnits?: string;
  regions?: string;
  salesforceTenants?: string;
  unitsConsumption?: string;
  orchestrationUnits?: string;
  bookitFormsUnits?: string;
  bookitLinksUnits?: string;
  bookitHandoffUnits?: string;
  customIntroContent?: string;
  customScopeContent?: string;
  customOutOfScopeContent?: string;
  customObjectivesDisclosureContent?: string;
  customAssumptionsContent?: string;
  customProjectPhasesContent?: string;
  customRolesContent?: string;
  customDeliverablesContent?: string;
  customObjectiveOverviewContent?: string;
  customKeyObjectivesContent?: string;
  template?: {
    name: string;
    description: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    client_city: string;
    client_state: string;
    client_zip: string;
    client_country: string;
  };
  customerSignatureName2?: string;
  customerSignature2?: string;
  customerEmail2?: string;
  approvalComments?: string;
  approvedAt?: string;
  approvedBy?: string;
  projectDescription?: string;
  leandataName?: string;
  leandataTitle?: string;
  leandataEmail?: string;
  opportunityId?: string;
  opportunityName?: string;
  opportunityAmount?: string | number;
  opportunityStage?: string;
  opportunityCloseDate?: string;
  billingCompanyName?: string;
  billingContactName?: string;
  billingAddress?: string;
  billingEmail?: string;
  purchaseOrderNumber?: string;
  contacts?: Array<{
    first_name?: string;
    last_name: string;
    email?: string;
    title?: string;
    role: string;
  }>;
  pricing?: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
      totalCost: number;
    }>;
    billing: {
      companyName: string;
      billingContact: string;
      billingAddress: string;
      billingEmail: string;
      poNumber: string;
      paymentTerms: string;
      currency: string;
    };
    project_management_included: boolean;
    project_management_hours: number;
    project_management_rate: number;
    base_hourly_rate: number;
    discount_type: string;
    discount_amount: number;
    discount_percentage: number;
    subtotal: number;
    discount_total: number;
    total_amount: number;
    auto_calculated: boolean;
    last_calculated: string | null;
  };
}

export default function PrintSOWPage() {
  const params = useParams();
  const [sow, setSow] = useState<SOW | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Function to download PDF directly
  const downloadPDF = async () => {
    if (!sow) return;
    
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/sow/${params.id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sow.sowTitle || 'SOW'} - ${sow.clientName || 'Client'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOW');
        }
        const data = await response.json();
        
        // Transform the nested API response to flat structure for components
        const transformedSow = {
          ...data,
          // Extract from nested objectives
          objectivesDescription: data.objectives?.description || data.objectives_description || '',
          objectivesKeyObjectives: data.objectives?.key_objectives || data.objectives_key_objectives || [],
          
          // Extract from nested scope
          deliverables: (() => {
            const rawDeliverables = data.scope?.deliverables || data.deliverables || '';
            if (Array.isArray(rawDeliverables)) {
              return rawDeliverables;
            }
            if (typeof rawDeliverables === 'string') {
              // Split by newlines and filter out empty lines
              return rawDeliverables.split('\n').filter(line => line.trim().length > 0);
            }
            return [];
          })(),
          
          // Extract from nested template
          clientName: data.template?.client_name || data.client_name || '',
          clientSignerName: data.template?.customer_signature_name || data.client_signer_name || '',
          clientTitle: data.template?.customer_signature || data.client_title || '',
          clientEmail: data.template?.customer_email || data.client_email || '',
          
          // Extract products from template
          products: data.template?.products || data.products || [],
          regions: data.template?.regions || data.regions || '',
          salesforceTenants: data.template?.salesforce_tenants || data.salesforce_tenants || '',
          timelineWeeks: data.template?.timeline_weeks || data.timeline_weeks || '',
          unitsConsumption: data.template?.units_consumption || data.units_consumption || '',
          orchestrationUnits: data.template?.orchestration_units || data.orchestration_units || '',
          bookitFormsUnits: data.template?.bookit_forms_units || data.bookit_forms_units || '',
          bookitLinksUnits: data.template?.bookit_links_units || data.bookit_links_units || '',
          bookitHandoffUnits: data.template?.bookit_handoff_units || data.bookit_handoff_units || '',
          numberOfUnits: data.template?.number_of_units || data.number_of_units || '',
          
          // Extract billing info from template
          billingCompanyName: data.template?.billing_company_name || '',
          billingContactName: data.template?.billing_contact_name || '',
          billingAddress: data.template?.billing_address || '',
          billingEmail: data.template?.billing_email || '',
          purchaseOrderNumber: data.template?.purchase_order_number || '',
          
          // Extract custom content fields
          customIntroContent: data.custom_intro_content || '',
          customScopeContent: data.custom_scope_content || '',
          customOutOfScopeContent: data.custom_out_of_scope_content || '',
          customObjectivesDisclosureContent: data.custom_objectives_disclosure_content || '',
          customAssumptionsContent: data.custom_assumptions_content || '',
          customProjectPhasesContent: data.custom_project_phases_content || '',
          customRolesContent: data.custom_roles_content || '',
          customDeliverablesContent: data.custom_deliverables_content || '',
          customObjectiveOverviewContent: data.custom_objective_overview_content || '',
          customKeyObjectivesContent: data.custom_key_objectives_content || '',
          
          // Extract other fields
          sowTitle: data.header?.sow_title || data.sow_title || '',
          companyLogo: data.header?.company_logo || data.company_logo || '',
          signatureDate: data.client_signature?.signature_date || data.signature_date || '',
          startDate: data.start_date || '',
          projectDescription: data.project_description || data.objectives?.description || '',
          
          // Extract client roles and pricing roles - match main SOW page structure
          clientRoles: Array.isArray(data.clientRoles) ? data.clientRoles.map((role: { role?: string; contact_title?: string; name?: string; email?: string; responsibilities?: string }) => ({
            role: role.role || role.contact_title || '',
            name: role.name || '',
            email: role.email || '',
            responsibilities: role.responsibilities || ''
          })) : [],
          pricingRoles: (() => {
            const rawPricingRoles = data.pricingRoles || [];
            
            if (Array.isArray(rawPricingRoles)) {
              return rawPricingRoles.map((role: { role?: string; role_name?: string; ratePerHour?: number; rate?: number; rate_per_hour?: number; totalHours?: number; hours?: number; total_hours?: number; totalCost?: number; total_cost?: number }) => ({
                role: role.role || role.role_name || 'Unknown Role',
                ratePerHour: parseFloat(String(role.ratePerHour || role.rate || role.rate_per_hour || 0)),
                totalHours: parseFloat(String(role.totalHours || role.hours || role.total_hours || 0)),
                totalCost: parseFloat(String(role.totalCost || role.total_cost || 0))
              }));
            }
            return [];
          })(),
          billingInfo: data.billing_info || {},
          
          // Extract second customer signature
          customerSignatureName2: data.template?.customer_signature_name_2 || data.customer_signature_name_2 || '',
          customerSignature2: data.template?.customer_signature_2 || data.customer_signature_2 || '',
          customerEmail2: data.template?.customer_email_2 || data.customer_email_2 || '',
          
          // Extract contacts
          contacts: data.contacts || [],
          
          // Add pricing object to match main SOW page structure
          pricing: {
            roles: Array.isArray(data.pricingRoles) ? data.pricingRoles.map((role: { role?: string; role_name?: string; ratePerHour?: number; rate?: number; rate_per_hour?: number; totalHours?: number; hours?: number; total_hours?: number; totalCost?: number; total_cost?: number }) => ({
              role: role.role || role.role_name || '',
              ratePerHour: parseFloat(String(role.ratePerHour || role.rate || role.rate_per_hour || 0)),
              totalHours: parseFloat(String(role.totalHours || role.hours || role.total_hours || 0)),
              totalCost: parseFloat(String(role.totalCost || role.total_cost || 0))
            })) : [],
            billing: data.billingInfo || {
              companyName: data.template?.billing_company_name || '',
              billingContact: data.template?.billing_contact_name || '',
              billingAddress: data.template?.billing_address || '',
              billingEmail: data.template?.billing_email || '',
              poNumber: data.template?.purchase_order_number || '',
              paymentTerms: 'Net 30',
              currency: 'USD',
            },
            project_management_included: data.pricing?.project_management_included || false,
            project_management_hours: data.pricing?.project_management_hours || 40,
            project_management_rate: data.pricing?.project_management_rate || 225,
            base_hourly_rate: data.pricing?.base_hourly_rate || 200,
            discount_type: data.pricing?.discount_type || 'none',
            discount_amount: data.pricing?.discount_amount || 0,
            discount_percentage: data.pricing?.discount_percentage || 0,
            subtotal: data.pricing?.subtotal || 0,
            discount_total: data.pricing?.discount_total || 0,
            total_amount: data.pricing?.total_amount || 0,
            auto_calculated: data.pricing?.auto_calculated || false,
            last_calculated: data.pricing?.last_calculated || null,
          }
        };
        
        setSow(transformedSow);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchSOW();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SOW...</p>
        </div>
      </div>
    );
  }

  if (error || !sow) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading SOW</h2>
          <p className="text-gray-600 mb-4">{error || 'SOW not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* SOW Content */}
      <div className="print-layout">
        {/* Title Page Section */}
        <div id="title-page" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid print:min-h-screen print:flex print:flex-col print:justify-center">
          <SOWTitlePage 
            title={sow.sowTitle || 'SOW Title Not Available'}
            clientName={sow.clientName || 'Client Name Not Available'}
            companyLogo={sow.companyLogo}
            clientSignature={{
              name: sow.clientSignerName || 'Not Entered',
              title: sow.clientTitle || 'Title Not Entered',
              email: sow.clientEmail || 'Email Not Entered',
              date: sow.signatureDate || ''
            }}
            clientSignature2={sow.customerSignatureName2 ? {
              name: sow.customerSignatureName2,
              title: sow.customerSignature2 || '',
              email: sow.customerEmail2 || '',
              date: ''
            } : undefined}
          />
        </div>

        {/* SOW Intro Section */}
        <div id="sow-intro" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
          <SOWIntroPage 
            clientName={sow.clientName || 'Client'}
            customContent={sow.customIntroContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom intro content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom intro content in the SOW editor.</p>
              </div>
            `}
            isEdited={false}
          />
        </div>

        {/* Objectives Section */}
        <div id="objectives" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">1. OBJECTIVE</h2>
          <SOWObjectivesPage 
            deliverables={sow.deliverables || []}
            keyObjectives={sow.objectivesKeyObjectives || []}
            projectDescription={sow.projectDescription || sow.objectivesDescription || ''}
            customContent={sow.customObjectivesDisclosureContent}
            customKeyObjectivesContent={sow.customKeyObjectivesContent}
            customDeliverablesContent={sow.customDeliverablesContent}
            deliverablesEdited={false}
            keyObjectivesEdited={false}
            isEdited={false}
            projectDetails={{
              products: sow.products || [],
              number_of_units: sow.numberOfUnits || '',
              regions: sow.regions || '',
              salesforce_tenants: sow.salesforceTenants || '',
              timeline_weeks: sow.timelineWeeks || '',
              start_date: sow.startDate ? new Date(sow.startDate) : new Date(),
              end_date: null,
              units_consumption: sow.unitsConsumption || '',
              orchestration_units: sow.orchestrationUnits || '',
              bookit_forms_units: sow.bookitFormsUnits || '',
              bookit_links_units: sow.bookitLinksUnits || '',
              bookit_handoff_units: sow.bookitHandoffUnits || ''
            }}
          />
          
          
        </div>

        {/* Scope Section */}
        <div id="scope" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
          <SOWScopePage 
            customContent={sow.customScopeContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom scope content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom scope content in the SOW editor.</p>
              </div>
            `}
            customDeliverablesContent={sow.customDeliverablesContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom deliverables content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom deliverables content in the SOW editor.</p>
              </div>
            `}
            isEdited={false}
          />
          
          {/* Out of Scope Section */}
          <div className="mt-8">
            <SOWOutOfScopePage 
              customContent={sow.customOutOfScopeContent || `
                <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom out-of-scope content not configured</p>
                  <p class="text-yellow-700 text-sm mt-1">Please configure the custom out-of-scope content in the SOW editor.</p>
                </div>
              `}
              isEdited={false}
            />
          </div>
        </div>

        {/* Project Phases Section */}
        <div id="project-phases" className="formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
          <SOWProjectPhasesPage 
            customContent={sow.customProjectPhasesContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom project phases content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom project phases content in the SOW editor.</p>
              </div>
            `}
            isEdited={false}
          />
        </div>

        {/* Roles Section */}
        <div id="roles" className=" formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>
          <SOWRolesPage 
            customContent={sow.customRolesContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom roles content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom roles content in the SOW editor.</p>
              </div>
            `}
            isEdited={false}
          />
          
          {/* Display Client Roles if they exist */}
          {sow.clientRoles && Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Client Roles</h3>
              <div className="overflow-x-auto formatSOWTable">
                <table className="min-w-full ">
                  <thead >
                    <tr>
                      <th className="px-6 py-3 text-left ">Role</th>
                      <th className="px-6 py-3 text-left ">Name</th>
                      <th className="px-6 py-3 text-left ">Email</th>
                      <th className="px-6 py-3 text-left ">Responsibilities</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sow.clientRoles.map((role: { role?: string; contact_title?: string; name?: string; email?: string; responsibilities?: string }, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{role.role || role.contact_title || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{role.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{role.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{role.responsibilities || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">5. PRICING</h2>
          
          {/* Pricing Introduction */}
          <div className="mb-6 p-4 rounded-lg border-l-4 border-blue-500" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="text-gray-700">
              The tasks above will be completed on a <strong>time and material basis</strong>, using the LeanData standard workday of 8 hours for a duration of <strong>{sow.timelineWeeks ? (() => {
                const totalWeeks = parseFloat(sow.timelineWeeks) || 0;
                if (totalWeeks < 1) {
                  const days = Math.ceil(totalWeeks * 7);
                  return `${days} ${days === 1 ? 'day' : 'days'}`;
                } else {
                  return `${totalWeeks} weeks`;
                }
              })() : 'N/A'}</strong>.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
            </p>
          </div>

          {/* Project Timeline Display */}
          {sow.timelineWeeks && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#F9FAFB' }}>
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                    <div>Phase</div>
                    <div>Description</div>
                    <div className="text-right">Duration</div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {(() => {
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
                    
                    return phases.map((phase, index) => (
                      <div key={phase.name} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className="font-medium text-gray-900">
                            {index + 1}. {phase.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {phase.description}
                          </div>
                          <div className="text-right font-medium text-gray-900">
                            {formatDuration(phase.duration)}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
          
          {/* Pricing Display Component */}
          <PricingDisplay
            pricingRoles={Array.isArray(sow.pricing?.roles) ? sow.pricing.roles.map(role => ({
              role: role.role || '',
              ratePerHour: role.ratePerHour || 0,
              totalHours: role.totalHours || 0,
              totalCost: (role.ratePerHour || 0) * (role.totalHours || 0)
            })) : []}
            discountType={(sow.pricing?.discount_type as 'none' | 'fixed' | 'percentage') || 'none'}
            discountAmount={sow.pricing?.discount_amount || 0}
            discountPercentage={sow.pricing?.discount_percentage || 0}
            subtotal={sow.pricing?.subtotal || 0}
            totalAmount={sow.pricing?.total_amount || 0}
            autoCalculated={sow.pricing?.auto_calculated || false}
            lastCalculated={sow.pricing?.last_calculated || null}
          />
          
          {/* Pricing Terms */}
          <div className="mt-6">
            <p className="mb-2 text-sm text-gray-700">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
            <p className="mb-2 text-sm text-gray-700">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
          </div>
          
          {/* Billing Information */}
          <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                From Salesforce
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <dt className="font-semibold text-gray-700">Company Name:</dt>
              <dd className="text-gray-900">{sow.billingCompanyName || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700">Billing Contact Name:</dt>
              <dd className="text-gray-900">{sow.billingContactName || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700">Billing Address:</dt>
              <dd className="text-gray-900">
                {(sow.billingAddress || 'N/A')
                  .split(',')
                  .map((line: string, idx: number) => (
                    <span key={idx} className="block">{line.trim()}</span>
                  ))}
              </dd>
              
              <dt className="font-semibold text-gray-700">Billing Email:</dt>
              <dd className="text-gray-900">{sow.billingEmail || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700">Purchase Order Number:</dt>
              <dd className="text-gray-900">{sow.purchaseOrderNumber || 'PO provided by customer'}</dd>
              
              <dt className="font-semibold text-gray-700">Payment Terms:</dt>
              <dd className="text-gray-900">Net 30</dd>
              
              <dt className="font-semibold text-gray-700">Currency:</dt>
              <dd className="text-gray-900">USD</dd>
            </dl>
            
            {/* Payment Terms Note */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Payment Terms:</strong> Net 30 • 
                <strong>Currency:</strong> USD • 
                <strong>Billing Cycle:</strong> Monthly or upon completion of major milestones
              </p>
            </div>
          </div>
        </div>

        {/* Assumptions Section */}
        <div id="assumptions" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
          <h2 className="text-3xl font-bold mb-6">6. ASSUMPTIONS</h2>
          <SOWAssumptionsPage 
            customContent={sow.customAssumptionsContent || `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p class="text-yellow-800 font-medium">⚠️ NOTE: Custom assumptions content not configured</p>
                <p class="text-yellow-700 text-sm mt-1">Please configure the custom assumptions content in the SOW editor.</p>
              </div>
            `}
            isEdited={false}
          />
        </div>

        {/* PDF Download Button */}
        <div className="mt-12 print:hidden">
          <button
            onClick={downloadPDF}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            disabled={downloadingPDF}
          >
            {downloadingPDF ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>

      </div>
    </div>
  );
}
