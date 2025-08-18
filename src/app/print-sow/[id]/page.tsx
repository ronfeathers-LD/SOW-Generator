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
import TimelineDisplay from '@/components/sow/TimelineDisplay';

interface SOW {
  id: string;
  sowTitle: string;
  clientName: string;
  companyLogo: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  clientSignerName?: string;
  clientTitle?: string;
  clientEmail?: string;
  signatureDate?: string;
  customer_signature_name_2?: string;
  customer_signature_2?: string;
  customer_email_2?: string;
  deliverables: string[];
  objectives?: {
    description: string;
    key_objectives: string[];
  };
  keyObjectives: string[];
  projectDescription: string;
  clientRoles: Array<{
    role?: string;
    name?: string;
    email?: string;
    responsibilities?: string;
    contact_title?: string;
  }>;
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    discount_type?: string;
    discount_amount?: number;
    discount_percentage?: number;
    subtotal?: number;
    total_amount?: number;
    auto_calculated?: boolean;
    last_calculated?: string | null;
  };
  pricingRoles: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
  }>;
  billingInfo?: {
    companyName: string;
    billingContact: string;
    billingAddress: string;
    billingEmail: string;
    poNumber: string;
  };
  startDate: string;
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
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  out_of_scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  project_phases_content_edited?: boolean;
  roles_content_edited?: boolean;
  deliverables_content_edited?: boolean;
  objective_overview_content_edited?: boolean;
  key_objectives_content_edited?: boolean;
  template?: {
    billing_company_name?: string;
    billing_contact_name?: string;
    billing_address?: string;
    billing_email?: string;
    purchase_order_number?: string;
    customer_signature_name?: string;
    customer_signature?: string;
    customer_email?: string;
  };
  salesforceAccountId?: string;
  version: number;
  status?: string;
}

interface SalesforceData {
  account_data?: {
    name: string;
    id: string;
  };
  contacts_data?: Array<{
    first_name?: string;
    last_name: string;
    email?: string;
    title?: string;
    role: string;
  }>;
}

export default function PrintableSOWPage() {
  const params = useParams();
  const [sow, setSOW] = useState<SOW | null>(null);
  const [salesforceData, setSalesforceData] = useState<SalesforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to find the appropriate signatory from Salesforce contacts
  function findSignatory(contacts: SalesforceData['contacts_data']): { name: string; title: string; email: string } | null {
    if (!contacts || contacts.length === 0) return null;
    
    // Priority order: decision_maker > primary_poc > first contact
    const decisionMaker = contacts.find(contact => contact.role === 'decision_maker');
    if (decisionMaker) {
      return {
        name: `${decisionMaker.first_name || ''} ${decisionMaker.last_name}`.trim(),
        title: decisionMaker.title || '',
        email: decisionMaker.email || ''
      };
    }
    
    const primaryPoc = contacts.find(contact => contact.role === 'primary_poc');
    if (primaryPoc) {
      return {
        name: `${primaryPoc.first_name || ''} ${primaryPoc.last_name}`.trim(),
        title: primaryPoc.title || '',
        email: primaryPoc.email || ''
      };
    }
    
    // Fallback to first contact
    const firstContact = contacts[0];
    return {
      name: `${firstContact.first_name || ''} ${firstContact.last_name}`.trim(),
      title: firstContact.title || '',
      email: firstContact.email || ''
    };
  }

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        if (!params.id) {
          setError('SOW ID is required');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/sow/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('SOW not found');
          }
          throw new Error(`Failed to fetch SOW: ${response.status}`);
        }
        const data = await response.json();
        
        // Parse JSON fields with safe defaults
        const parsedData = {
          ...data,
          // Fix field mapping - API returns snake_case, we need camelCase
          clientName: data.client_name || data.clientName || '',
          deliverables: data.deliverables ? data.deliverables.split('\n').filter(Boolean) : [],
          projectDescription: data.objectives?.description || '',
          keyObjectives: Array.isArray(data.objectives?.key_objectives) ? data.objectives.key_objectives : [],
          clientRoles: Array.isArray(data.clientRoles) ? data.clientRoles.map((role: unknown) => {
            const roleObj = role as { role?: string; name?: string; email?: string; responsibilities?: string };
            return {
              role: roleObj.role || '',
              name: roleObj.name || '',
              email: roleObj.email || '',
              responsibilities: roleObj.responsibilities || ''
            };
          }) : [],
          pricing: {
            roles: Array.isArray(data.pricingRoles) ? data.pricingRoles.map((role: unknown) => {
              const roleObj = role as { role?: string; ratePerHour?: number; rate?: number; totalHours?: number; hours?: number; rate_per_hour?: number; total_hours?: number };
              return {
                role: roleObj.role || '',
                ratePerHour: roleObj.ratePerHour || roleObj.rate || roleObj.rate_per_hour || 0,
                totalHours: roleObj.totalHours || roleObj.hours || roleObj.total_hours || 0,
              };
            }) : [],
          },
          billingInfo: data.billingInfo || {
            companyName: '',
            billingContact: '',
            billingAddress: '',
            billingEmail: '',
            poNumber: '',
          },
          // Signature-related fields
          clientSignature: data.template?.customer_signature_name ? {
            name: data.template.customer_signature_name,
            title: data.template.customer_signature || data.client_title || '',
            email: data.template.customer_email || data.client_email || '',
            date: data.signature_date || new Date().toISOString()
          } : undefined,
          clientSignerName: data.template?.customer_signature_name || data.client_signer_name || undefined,
          clientTitle: data.template?.customer_signature || data.client_title || '',
          clientEmail: data.template?.customer_email || data.client_email || '',
          signatureDate: data.signature_date || '',
          // Second Customer Signer (optional)
          customer_signature_name_2: data.template?.customer_signature_name_2 || undefined,
          customer_signature_2: data.template?.customer_signature_2 || undefined,
          customer_email_2: data.template?.customer_email_2 || undefined,
          // Template fields
          template: {
            billing_company_name: data.template?.billing_company_name || (data.billing_info as Record<string, unknown>)?.company_name || '',
            billing_contact_name: data.template?.billing_contact_name || (data.billing_info as Record<string, unknown>)?.billing_contact || '',
            billing_address: data.template?.billing_address || (data.billing_info as Record<string, unknown>)?.billing_address || '',
            billing_email: data.template?.billing_email || (data.billing_info as Record<string, unknown>)?.billing_email || '',
            purchase_order_number: data.template?.purchase_order_number || (data.billing_info as Record<string, unknown>)?.po_number || '',
            customer_signature_name: data.template?.customer_signature_name || data.client_signer_name || '',
            customer_signature: data.template?.customer_signature || data.client_title || '',
            customer_email: data.template?.customer_email || data.client_email || '',
          },
        };
        
        setSOW(parsedData);
        
        // Fetch Salesforce data if available
        try {
          const sfResponse = await fetch(`/api/sow/${params.id}/salesforce-data`);
          if (sfResponse.ok) {
            const sfData = await sfResponse.json();
            setSalesforceData(sfData);
          } else {
            // console.log('Salesforce API response not ok:', sfResponse.status, sfResponse.statusText);
          }
        } catch {
          // No Salesforce data available
        }
        
      } catch (error) {
        // console.error('Error fetching SOW:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch SOW');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id]);

  // Auto-print when component mounts
  useEffect(() => {
    if (sow && !loading) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        // Don't auto-print, let user control it
        // window.print();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [sow, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SOW...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-800">Error Loading SOW</h3>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-yellow-800">SOW Not Found</h3>
            <p className="mt-2 text-yellow-700">The requested SOW could not be found.</p>
          </div>
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
            clientName={(() => {
              const sfAccountName = salesforceData?.account_data?.name;
              const sowClientName = sow.clientName;
              if (sfAccountName && sfAccountName.trim()) {
                return sfAccountName.trim();
              }
              if (salesforceData?.contacts_data && salesforceData.contacts_data.length > 0) {
                const firstContact = salesforceData.contacts_data[0];
                if (firstContact.email) {
                  const emailDomain = firstContact.email.split('@')[1];
                  if (emailDomain) {
                    const companyName = emailDomain
                      .split('.')[0]
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    return companyName;
                  }
                }
              }
              if (sowClientName && sowClientName.trim()) {
                return sowClientName.trim();
              }
              return 'Client Name Not Available';
            })()}
            companyLogo={sow.companyLogo}
            clientSignature={{
              name: findSignatory(salesforceData?.contacts_data)?.name || sow.clientSignerName || sow.clientSignature?.name || 'Not Entered',
              title: findSignatory(salesforceData?.contacts_data)?.title || sow.clientSignature?.title || sow.clientTitle || 'Title Not Entered',
              email: findSignatory(salesforceData?.contacts_data)?.email || sow.clientSignature?.email || sow.clientEmail || 'Email Not Entered',
              date: ''
            }}
            clientSignature2={sow.customer_signature_name_2 ? {
              name: sow.customer_signature_name_2,
              title: sow.customer_signature_2 || '',
              email: sow.customer_email_2 || '',
              date: ''
            } : undefined}
          />
          
          {/* Debug: Show signature data for troubleshooting */}
          {/* Debug information removed for production */}
        </div>

        {/* Page Break Before Content - Only in print */}
        <div className="hidden print:block print:page-break-before print:page-break-before-always print:min-h-0"></div>

        {/* SOW Intro Page Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold text-center mb-6 print:text-2xl print:mb-4">LEANDATA, INC. STATEMENT OF WORK</h2>
          <SOWIntroPage 
            clientName={salesforceData?.account_data?.name || sow.clientName}
            customContent={sow.custom_intro_content}
            isEdited={sow.intro_content_edited}
          />
        </div>

        {/* SOW Objectives Page Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">1. OBJECTIVE</h2>
          <SOWObjectivesPage 
            deliverables={sow.deliverables} 
            keyObjectives={sow.keyObjectives}
            projectDescription={sow.projectDescription}
            customContent={sow.custom_objectives_disclosure_content}
            customKeyObjectivesContent={sow.custom_key_objectives_content}
            customDeliverablesContent={sow.custom_deliverables_content}
            deliverablesEdited={sow.deliverables_content_edited}
            keyObjectivesEdited={sow.key_objectives_content_edited}
            isEdited={sow.objectives_disclosure_content_edited}
            projectDetails={{
              products: sow.products || [],
              number_of_units: sow.number_of_units || '',
              regions: sow.regions || '',
              salesforce_tenants: sow.salesforce_tenants || '',
              timeline_weeks: sow.timeline_weeks || '',
              start_date: new Date(sow.startDate),
              end_date: null,
              units_consumption: sow.units_consumption || '',
              orchestration_units: sow.orchestration_units || '',
              bookit_forms_units: sow.bookit_forms_units || '',
              bookit_links_units: sow.bookit_links_units || '',
              bookit_handoff_units: sow.bookit_handoff_units || ''
            }}
          />
        </div>

        {/* SOW Scope Page Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">2. SCOPE</h2>
          <SOWScopePage 
            customContent={sow.custom_scope_content}
            customDeliverablesContent={sow.custom_deliverables_content}
            isEdited={sow.scope_content_edited}
          />

          {/* SOW Out of Scope Page */}
          <SOWOutOfScopePage 
            customContent={sow.custom_out_of_scope_content}
            isEdited={sow.out_of_scope_content_edited}
          />
        </div>

        {/* SOW Project Phases Page Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
          <div className="formatSOWTable">
            <SOWProjectPhasesPage 
              customContent={sow.custom_project_phases_content}
              isEdited={sow.project_phases_content_edited}
            />
          </div>
        </div>

        {/* Roles and Responsibilities Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">4. ROLES AND RESPONSIBILITIES</h2>
          
          {/* Debug: Show roles data for troubleshooting */}
          {/* Debug information removed for production */}
          
          <div className="formatSOWTable">
            <SOWRolesPage 
              customContent={sow.custom_roles_content}
              isEdited={sow.roles_content_edited}
            />
          </div>
          
          {/* Client Roles Table */}
          {Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
            <div className="overflow-x-auto print:overflow-visible print:mt-6">
              <div className="formatSOWTable">
                <table className="min-w-full divide-y border print:w-full print:border-collapse print-optimized-table">
                  <thead className="bg-gray-50 print:bg-gray-100">
                    <tr>
                      <th className="uppercase tracking-wider px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">Role (Title)</th>
                      <th className="uppercase tracking-wider px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">Name</th>
                      <th className="uppercase tracking-wider px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">Email</th>
                      <th className="uppercase tracking-wider px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">Responsibilities</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 print:divide-y-0">
                    {sow.clientRoles.map((role, idx) => (
                      <tr key={idx} className="print:border-b print:border-gray-300">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 print:px-4 print:py-2 print:border print:border-gray-300">{role.role || role.contact_title || 'N/A'}</td>
                        <td className="px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">{role.name || 'N/A'}</td>
                        <td className="px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">{role.email || 'N/A'}</td>
                        <td className="px-6 py-4 print:px-4 print:py-2 print:border print:border-gray-300">
                          <div className="whitespace-pre-wrap max-w-md print:max-w-none">
                            {role.responsibilities || ''}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">5. PRICING</h2>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500 print:bg-gray-100 print:border-l-4 print:border-blue-500 print:rounded-none">
            <p className="text-gray-700 print:text-gray-900">
              The tasks above will be completed on a <strong>time and material basis</strong>, using the LeanData standard workday of 8 hours for a duration of <strong>{sow.timeline_weeks ? (() => {
                const totalWeeks = parseFloat(sow.timeline_weeks) || 0;
                if (totalWeeks < 1) {
                  const days = Math.ceil(totalWeeks * 7);
                  return `${days} ${days === 1 ? 'day' : 'days'}`;
                } else {
                  return `${totalWeeks} weeks`;
                }
              })() : 'N/A'}</strong>.
            </p>
            <p className="text-sm text-gray-600 mt-2 print:text-sm print:text-gray-700">
              Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
            </p>
          </div>

          {/* Project Timeline Display */}
          {sow.timeline_weeks && (
            <div className="mb-6 print:mb-4">
              <TimelineDisplay timelineWeeks={sow.timeline_weeks} />
            </div>
          )}
          
          {/* Pricing Display Component */}
          <PricingDisplay
            pricingRoles={Array.isArray(sow.pricing.roles) ? sow.pricing.roles.map(role => ({
              role: role.role || '',
              ratePerHour: role.ratePerHour || 0,
              totalHours: role.totalHours || 0,
              totalCost: (role.ratePerHour || 0) * (role.totalHours || 0)
            })) : []}
            discountType={(sow.pricing?.discount_type === 'fixed' || sow.pricing?.discount_type === 'percentage') ? sow.pricing.discount_type : 'none'}
            discountAmount={sow.pricing?.discount_amount || 0}
            discountPercentage={sow.pricing?.discount_percentage || 0}
            subtotal={(() => {
              // Calculate subtotal from pricing roles
              if (Array.isArray(sow.pricing.roles)) {
                return sow.pricing.roles.reduce((total, role) => {
                  const roleCost = (role.ratePerHour || 0) * (role.totalHours || 0);
                  return total + roleCost;
                }, 0);
              }
              return sow.pricing?.subtotal || 0;
            })()}
            totalAmount={(() => {
              // Calculate total amount including discounts
              const calculatedSubtotal = (() => {
                if (Array.isArray(sow.pricing.roles)) {
                  return sow.pricing.roles.reduce((total, role) => {
                    const roleCost = (role.ratePerHour || 0) * (role.totalHours || 0);
                    return total + roleCost;
                  }, 0);
                }
                return sow.pricing?.subtotal || 0;
              })();
              
              // Apply discount if any
              if (sow.pricing?.discount_type === 'fixed') {
                return Math.max(0, calculatedSubtotal - (sow.pricing.discount_amount || 0));
              } else if (sow.pricing?.discount_type === 'percentage') {
                const discountMultiplier = 1 - ((sow.pricing.discount_percentage || 0) / 100);
                return calculatedSubtotal * discountMultiplier;
              }
              
              return calculatedSubtotal;
            })()}
            autoCalculated={sow.pricing?.auto_calculated || false}
            lastCalculated={sow.pricing?.last_calculated || null}
          />

          <div className="mt-6 print:mt-4 space-y-2 print:space-y-1">
            <p className="text-sm text-gray-700 print:text-sm print:text-gray-900">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
            <p className="text-sm text-gray-700 print:text-sm print:text-gray-900">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
          </div>
          
          {/* Billing Information */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg print:bg-gray-100 print:rounded-none print:mt-6">
            <div className="flex items-center justify-between mb-4 print:mb-3">
              <h3 className="text-lg font-semibold text-gray-900 print:text-lg">Billing Information</h3>
              {sow.salesforceAccountId && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full print:bg-blue-200 print:text-blue-900">
                  From Salesforce
                </span>
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm print:gap-x-4 print:gap-y-2">
              <dt className="font-semibold text-gray-700 print:text-gray-900">Company Name:</dt>
              <dd className="text-gray-900 print:text-gray-900">{sow.template?.billing_company_name || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Billing Contact Name:</dt>
              <dd className="text-gray-900 print:text-gray-900">{sow.template?.billing_contact_name || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Billing Address:</dt>
              <dd className="text-gray-900 print:text-gray-900">
                {(sow.template?.billing_address || 'N/A')
                  .split(',')
                  .map((line: string, idx: number) => (
                    <span key={idx} className="block">{line.trim()}</span>
                  ))}
              </dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Billing Email:</dt>
              <dd className="text-gray-900 print:text-gray-900">{sow.template?.billing_email || 'N/A'}</dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Purchase Order Number:</dt>
              <dd className="text-gray-900 print:text-gray-900">{sow.template?.purchase_order_number || 'PO provided by customer'}</dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Payment Terms:</dt>
              <dd className="text-gray-900 print:text-gray-900">Net 30</dd>
              
              <dt className="font-semibold text-gray-700 print:text-gray-900">Currency:</dt>
              <dd className="text-gray-900 print:text-gray-900">USD</dd>
            </dl>
            
            {/* Payment Terms Note */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 print:bg-yellow-100 print:rounded-none print:mt-3">
              <p className="text-sm text-yellow-800 print:text-yellow-900">
                <strong>Payment Terms:</strong> Net 30 • 
                <strong>Currency:</strong> USD • 
                <strong>Billing Cycle:</strong> Monthly or upon completion of major milestones
              </p>
            </div>
          </div>
        </div>

        {/* SOW Assumptions Page Section */}
        <div className="bg-white p-8 mb-12 print:mb-8 print:p-6 page-break-inside-avoid print:page-break-inside-avoid print-section">
          <h2 className="text-3xl font-bold mb-6 print:text-2xl print:mb-4">6. ASSUMPTIONS</h2>
          <SOWAssumptionsPage 
            customContent={sow.custom_assumptions_content}
            isEdited={sow.assumptions_content_edited}
          />
        </div>
      </div>
    </div>
  );
}
