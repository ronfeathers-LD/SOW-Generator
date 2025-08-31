'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWOutOfScopePage from '@/components/sow/SOWOutOfScopePage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import SOWProjectPhasesPage from '@/components/sow/SOWProjectPhasesPage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';
import PricingDisplay from '@/components/sow/PricingDisplay';
import SimpleApproval from '@/components/sow/SimpleApproval';
import SOWComments from '@/components/sow/SOWComments';
import SaveToGoogleDrive from '@/components/sow/SaveToGoogleDrive';
import { useSession } from 'next-auth/react';
import { parseObjectives } from '@/lib/utils/parse-objectives';


// Validation Submit Button Component
function ValidationSubmitButton({ sow }: { sow: SOW }) {
  const [validation, setValidation] = useState<{
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkValidation = useCallback(async () => {
    try {
      // Use the client-safe validation utility
      const { validateSOWForApproval } = await import('@/lib/validation-utils');
      const validationResult = validateSOWForApproval(sow as unknown as Record<string, unknown>);
      
      setValidation(validationResult);
      return validationResult.isValid;
    } catch (error) {
      console.error('❌ Error checking validation:', error);
      return false;
    }
  }, [sow]);

  const handleSubmitForReview = async () => {
    try {
      // Check validation before allowing submission
      const isValid = await checkValidation();
      if (!isValid) {
        alert('Cannot submit for review: SOW validation failed. Please complete all required fields first.');
        return;
      }

      setSubmitting(true);
      
      // Simply update the SOW status to 'in_review'
      const response = await fetch(`/api/sow/${sow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'in_review',
          updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Show success message
        alert('SOW submitted for review successfully!');
        // Refresh the page to show the updated status
        window.location.reload();
      } else {
        const error = await response.text();
        alert(`Failed to submit for review: ${error}`);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  // Check validation when component mounts
  useEffect(() => {
    checkValidation();
  }, [sow.id, checkValidation]);

  return (
    <div>


      <button
        onClick={handleSubmitForReview}
        disabled={submitting || (validation?.isValid === false)}
        className={`px-4 py-2 rounded transition-colors ${
          validation?.isValid === false
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50`}
        title={
          validation?.isValid === false
            ? `Cannot submit: ${validation.missingFields.length} missing fields, ${validation.errors.length} validation errors`
            : 'Click to submit SOW for review'
        }
      >
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
      
      {/* Show validation errors if button is disabled */}
      {validation?.isValid === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <p className="text-red-800 font-medium mb-2">❌ Cannot Submit for Review:</p>
          
          {validation.missingFields.length > 0 && (
            <div className="mb-2">
              <p className="text-red-700 font-medium">Missing Required Fields:</p>
              <ul className="text-red-600 ml-4 list-disc">
                {validation.missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.errors.length > 0 && (
            <div className="mb-2">
              <p className="text-red-700 font-medium">Validation Errors:</p>
              <ul className="text-red-600 ml-4 list-disc">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="text-red-600 text-xs">
            Complete all required fields above to enable submission for review.
          </p>
        </div>
      )}
    </div>
  );
}

interface ClientRole {
  role: string;
  responsibilities: string;
  name: string;
  email: string;
  salesforce_contact_id?: string;
  contact_title?: string;
}

interface SOW {
  id: string;
  clientName: string;
  sowTitle: string;
  clientTitle: string;
  clientEmail: string;
  signatureDate: string;
  deliverables: string[];
  projectDescription: string;
  keyObjectives: string[];
  startDate: string;
  duration: string;
  clientRoles: ClientRole[];
  pricingRoles?: Array<{
    role: string;
    rate_per_hour: number;
    total_hours: number;
    totalCost: number;
  }>; // Add pricing roles
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    billing: {
      companyName: string;
      billingContact: string;
      billingAddress: string;
      billingEmail: string;
      poNumber: string;
      paymentTerms: string;
      currency: string;
      taxRate?: number;
      shipping?: number;
    };
    // New pricing configuration fields
    project_management_included?: boolean;
    project_management_hours?: number;
    project_management_rate?: number;
    base_hourly_rate?: number;
    discount_type?: 'none' | 'fixed' | 'percentage';
    discount_amount?: number;
    discount_percentage?: number;
    subtotal?: number;
    discount_total?: number;
    total_amount?: number;
    auto_calculated?: boolean;
    last_calculated?: string | null;
  };
  accessRequirements: string;
  travelRequirements: string;
  workingHours: string;
  testingResponsibilities: string;

  version: number;
  companyLogo: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  clientSignerName?: string;
  salesforceAccountId?: string;
  
  // Second Customer Signer (optional)
  customer_signature_name_2?: string;
  customer_signature_2?: string;
  customer_email_2?: string;

  // Project Details
  products?: string[];
  number_of_units?: string;
  regions?: string;
  salesforce_tenants?: string;
  timeline_weeks?: string;

  units_consumption?: string;
  
  // BookIt Family Units
  orchestration_units?: string;
  bookit_forms_units?: string;
  bookit_links_units?: string;
  bookit_handoff_units?: string;
  
  // Custom content tracking
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
  
  // Template fields for billing and other data
  template?: {
    billing_company_name?: string;
    billing_contact_name?: string;
    billing_address?: string;
    billing_email?: string;
    purchase_order_number?: string;
    customer_signature_name?: string;
    customer_signature?: string;
    customer_email?: string;
    // LeanData signatory fields
    lean_data_name?: string;
    lean_data_title?: string;
    lean_data_email?: string;
  };

  // Approval/Rejection fields
  approved_at?: string;
  rejected_at?: string;
  approval_comments?: string;
  
  // PM Hours Removal fields
  pm_hours_requirement_disabled?: boolean;
  pm_hours_requirement_disabled_date?: string;
  pm_hours_requirement_disabled_requester_id?: string;
  pm_hours_requirement_disabled_approver_id?: string;
}

interface SOWVersion {
  id: string;
  version: number;
  isLatest: boolean;
  createdAt: string;
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
  opportunity_data?: unknown;
}



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

export default function SOWDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [sow, setSOW] = useState<SOW | null>(null);
  const [salesforceData, setSalesforceData] = useState<SalesforceData | null>(null);
  const [versions, setVersions] = useState<SOWVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Download modal states
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'generating' | 'downloading' | 'success' | 'error'>('idle');


  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  // Check for URL error parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'immutable') {
      setError('This SOW version is immutable and cannot be edited. Please create a new version to make changes.');
    }
  }, []);

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
          deliverables: data.deliverables ? data.deliverables.split('\n').filter(Boolean) : [],
                              projectDescription: data.objectives?.description || '',
          keyObjectives: parseObjectives(data.objectives?.key_objectives),
          clientRoles: Array.isArray(data.roles?.client_roles) ? data.roles.client_roles.map((role: unknown) => {
            const roleObj = role as { role?: string; name?: string; email?: string; responsibilities?: string };
            return {
              role: roleObj.role || '',
              name: roleObj.name || '',
              email: roleObj.email || '',
              responsibilities: roleObj.responsibilities || ''
            };
          }) : [],
                                            pricing: {
                        roles: [], // Remove this transformation - we'll use data.pricingRoles directly
                        billing: data.billingInfo || {
                          companyName: '',
                          billingContact: '',
                          billingAddress: '',
                          billingEmail: '',
                          poNumber: '',
                          paymentTerms: '',
                          currency: '',
                        },
                        // New pricing configuration fields
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
                                },
          
          // Add pricingRoles directly from API
          pricingRoles: data.pricingRoles || [],
          
          companyLogo: data.header?.company_logo || data.companyLogo || '',
          clientName: data.template?.client_name || data.client_name || data.header?.client_name || '',
          sowTitle: data.sow_title || data.title || 'Untitled SOW',
          clientSignature: data.template?.customer_signature_name ? {
            name: data.template.customer_signature_name,
            title: data.template.customer_signature || data.client_title || '',
            email: data.template.customer_email || data.client_email || '',
            date: data.signature_date || new Date().toISOString()
          } : undefined,
          clientSignerName: data.template?.customer_signature_name || data.client_signer_name || undefined,
          clientTitle: data.template?.customer_signature || data.client_title || '',
          clientEmail: data.template?.customer_email || data.client_email || '',
          // Second Customer Signer (optional)
          customer_signature_name_2: data.template?.customer_signature_name_2 || undefined,
          customer_signature_2: data.template?.customer_signature_2 || undefined,
          customer_email_2: data.template?.customer_email_2 || undefined,

          salesforceAccountId: data.salesforce_account_id || undefined,
          
          // Template fields for billing and customer information
          template: {
            billing_company_name: data.template?.billing_company_name || (data.billing_info as Record<string, unknown>)?.company_name || '',
            billing_contact_name: data.template?.billing_contact_name || (data.billing_info as Record<string, unknown>)?.billing_contact || '',
            billing_address: data.template?.billing_address || (data.billing_info as Record<string, unknown>)?.billing_address || '',
            billing_email: data.template?.billing_email || (data.billing_info as Record<string, unknown>)?.billing_email || '',
            purchase_order_number: data.template?.purchase_order_number || (data.billing_info as Record<string, unknown>)?.po_number || '',
            customer_signature_name: data.template?.customer_signature_name || data.client_signer_name || '',
            customer_signature: data.template?.customer_signature || data.client_title || '',
            customer_email: data.template?.customer_email || data.client_email || '',
            // LeanData signatory fields
            lean_data_name: data.template?.lean_data_name || '',
            lean_data_title: data.template?.lean_data_title || '',
            lean_data_email: data.template?.lean_data_email || '',
          },
          
          custom_intro_content: data.custom_intro_content || undefined,
          custom_scope_content: data.custom_scope_content || undefined,
          custom_out_of_scope_content: data.custom_out_of_scope_content || undefined,
          custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || undefined,
          custom_assumptions_content: data.custom_assumptions_content || undefined,
          custom_project_phases_content: data.custom_project_phases_content || undefined,
          custom_roles_content: data.custom_roles_content || undefined,
          custom_deliverables_content: data.custom_deliverables_content || undefined,
          custom_objective_overview_content: data.custom_objective_overview_content || undefined,
          custom_key_objectives_content: data.custom_key_objectives_content || undefined,
          // Project Details
          products: data.template?.products || [],
          number_of_units: data.template?.number_of_units || data.number_of_units || '',
          regions: data.template?.regions || data.regions || '',
          salesforce_tenants: data.template?.salesforce_tenants || data.salesforce_tenants || '',
          timeline_weeks: data.template?.timeline_weeks || data.timeline_weeks || '',

          units_consumption: data.template?.units_consumption || data.units_consumption || '',
          
          // BookIt Family Units
          orchestration_units: data.template?.number_of_units || data.orchestration_units || '',
          bookit_forms_units: data.template?.bookit_forms_units || data.bookit_forms_units || '',
          bookit_links_units: data.template?.bookit_links_units || data.bookit_links_units || '',
          bookit_handoff_units: data.template?.bookit_handoff_units || data.bookit_handoff_units || '',
          
          // LeanData signatory fields (for validation compatibility)
          leandata_name: data.template?.lean_data_name || data.leandata_name || '',
          leandata_title: data.template?.lean_data_title || data.leandata_title || '',
          leandata_email: data.template?.lean_data_email || data.leandata_email || '',
          
          intro_content_edited: data.intro_content_edited || false,
          scope_content_edited: data.scope_content_edited || false,
          out_of_scope_content_edited: data.out_of_scope_content_edited || false,
          objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
          assumptions_content_edited: data.assumptions_content_edited || false,
          project_phases_content_edited: data.project_phases_content_edited || false,
          roles_content_edited: data.roles_content_edited || false,
          deliverables_content_edited: data.deliverables_content_edited || false,
          objective_overview_content_edited: data.objective_overview_content_edited || false,
          key_objectives_content_edited: data.key_objectives_content_edited || false,

          // Approval/Rejection fields
          approved_at: data.approved_at || undefined,
          rejected_at: data.rejected_at || undefined,
          approval_comments: data.approval_comments || undefined,
        };
        
        setSOW(parsedData);
        
        // Fetch Salesforce data if available
        if (parsedData.salesforceAccountId) {
          try {
            const salesforceResponse = await fetch(`/api/sow/${params.id}/salesforce-data`);
            if (salesforceResponse.ok) {
              const salesforceResult = await salesforceResponse.json();
              if (salesforceResult.success && salesforceResult.data) {
                setSalesforceData(salesforceResult.data);
              }
            }
          } catch (salesforceError) {
            console.warn('Failed to fetch Salesforce data:', salesforceError);
            // Don't fail the entire page load if Salesforce data fails
          }
        }

        // Fetch version history
        const versionsResponse = await fetch(`/api/sow/${params.id}/versions`);
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          setVersions(versionsData);
        }
      } catch (err) {
        console.error('Error fetching SOW:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id]);



  const isEditable = useMemo(() => {
    if (!sow) return false;
    // Only draft SOWs can be edited - approved/rejected versions are immutable
    return sow.status === 'draft';
  }, [sow]);











  if (loading) {
    return (
      <div className="text-center">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">{error}</div>
    );
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading SOW...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Error Loading SOW</h3>
          <p className="mt-2 text-red-700">{error}</p>
          <div className="mt-4">
            <Link
              href="/sow"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              Back to SOWs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800">SOW Not Found</h3>
          <p className="mt-2 text-yellow-700">The requested SOW could not be found.</p>
          <div className="mt-4">
            <Link
              href="/sow"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
            >
              Back to SOWs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {sow && (
          <>
                        <div className="mb-8 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                View SOW
              </h1>
              <div className="flex items-center space-x-3">
                {isEditable && (
                  <Link
                    href={`/sow/${params.id}/edit`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                )}
                <button
                  onClick={async () => {
                    console.log('🔘 Download button clicked!');
                    setDownloadingPDF(true);
                    setDownloadStatus('generating');
                    setShowDownloadModal(true);
                    
                    try {
                      console.log('🚀 Starting PDF generation...');
                      const response = await fetch(`/api/sow/${sow.id}/pdf`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });

                      if (!response.ok) {
                        throw new Error('Failed to generate PDF');
                      }

                      console.log('✅ PDF generated successfully, downloading...');
                      setDownloadStatus('downloading');
                      
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
                      
                      console.log('💾 Download completed successfully!');
                      setDownloadStatus('success');
                      
                      // Auto-close after 3 seconds
                      setTimeout(() => {
                        setShowDownloadModal(false);
                        setDownloadingPDF(false);
                        setDownloadStatus('idle');
                      }, 3000);
                      
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                      setDownloadStatus('error');
                      setDownloadingPDF(false);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Download PDF to your computer"
                  disabled={downloadingPDF}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <Link
                  href={`/print-sow/${params.id}`}
                  target="_blank"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Open SOW in print view"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print View
                </Link>
                <button
                  onClick={async () => {
                    if (!sow) return;
                    
                    // Enhanced confirmation dialog
                    const confirmMessage = `Are you sure you want to delete "${sow.sowTitle || 'this SOW'}"?\n\n` +
                      `This action will permanently hide this SOW and all its versions from the system.\n` +
                      `The data will be preserved but will no longer be visible.\n\n` +
                      `Type "DELETE" to confirm:`;
                    
                    const userInput = prompt(confirmMessage);
                    if (userInput !== 'DELETE') {
                      return;
                    }

                    try {
                      const response = await fetch(`/api/sow/${params.id}`, {
                        method: 'DELETE',
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to delete SOW');
                      }

                      const result = await response.json();
                      
                      // Show success message
                      alert(`SOW "${sow.sowTitle || 'SOW'}" deleted successfully${result.hiddenVersions ? ` along with ${result.hiddenVersions} version(s)` : ''}.`);

                      // Redirect to the SOW list page
                      router.push('/sow');
                    } catch (err) {
                      const errorMessage = err instanceof Error ? err.message : 'Failed to delete SOW';
                      alert(`Error: ${errorMessage}`);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1 border border-red-600 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Delete SOW from the system"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>

            </div>



            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main SOW Content - Left Column (2/3 width) */}
              <div className="lg:col-span-2">
                <div id="sow-content-to-export">
              {/* Title Page Section */}
                <div id="title-page" className="mb-12">
                  <SOWTitlePage
                    title={sow.sowTitle || 'SOW Title Not Available'}
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    companyLogo={sow.companyLogo}
                    clientSignature={{
                          name: findSignatory(salesforceData?.contacts_data)?.name || sow.clientSignerName || sow.clientSignature?.name || 'Not Entered',
                          title: findSignatory(salesforceData?.contacts_data)?.title || sow.clientSignature?.title || sow.clientTitle || 'Title Not Entered',
                          email: findSignatory(salesforceData?.contacts_data)?.email || sow.clientSignature?.email || sow.clientEmail || 'Email Not Entered',
                          date: sow.signatureDate || ''
                        }}
                    clientSignature2={sow.customer_signature_name_2 ? {
                      name: sow.customer_signature_name_2,
                      title: sow.customer_signature_2 || '',
                      email: sow.customer_email_2 || '',
                      date: ''
                    } : undefined}
                    leanDataSignature={sow.template?.lean_data_name && sow.template?.lean_data_title && sow.template?.lean_data_email ? {
                      name: sow.template.lean_data_name,
                      title: sow.template.lean_data_title,
                      email: sow.template.lean_data_email
                    } : undefined}
                  />
                </div>


              {/* SOW Intro Page Section */}
                <div id="content-introduction" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
                  <SOWIntroPage 
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    customContent={sow.custom_intro_content}
                    isEdited={sow.intro_content_edited}
                  />
                </div>


              {/* SOW Objectives Page Section */}
                <div id="content-objectives" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold  mb-6">1. OBJECTIVE</h2>
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
                <div id="content-scope" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
                  <SOWScopePage 
                    customContent={sow.custom_scope_content}
                    customDeliverablesContent={sow.custom_deliverables_content}
                    isEdited={sow.scope_content_edited}
                  />

              {/* SOW Out of Scope Page Section */}
                  <SOWOutOfScopePage 
                    customContent={sow.custom_out_of_scope_content}
                    isEdited={sow.out_of_scope_content_edited}
                  />
                </div>

              {/* SOW Project Phases Page Section */}
                <div id="content-project-phases" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
                  <div className="formatSOWTable">
                  <SOWProjectPhasesPage 
                    customContent={sow.custom_project_phases_content}
                    isEdited={sow.project_phases_content_edited}
                  />
                  </div>
                </div>

              {/* Roles and Responsibilities Section */}
                <div id="content-roles" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>
                  
                  {/* LeanData Roles */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">LeanData Roles</h3>
                    <div className="formatSOWTable">
                      <SOWRolesPage 
                        customContent={sow.custom_roles_content}
                        isEdited={sow.roles_content_edited}
                      />
                    </div>
                  </div>
                  
                  {/* Client Roles Table */}
                  {Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Client Roles</h3>
                      <div className="overflow-x-auto">
                        <div className="formatSOWTable">
                        <table className="min-w-full divide-y border">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="uppercase tracking-wider">Role (Title)</th>
                              <th className="uppercase tracking-wider">Name</th>
                              <th className="uppercase tracking-wider">Email</th>
                              <th className="uppercase tracking-wider">Responsibilities</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sow.clientRoles.map((role, idx) => (
                              <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{role.role || role.contact_title || 'N/A'}</td>
                                <td>{role.name || 'N/A'}</td>
                                <td>{role.email || 'N/A'}</td>
                                <td>
                                  <div className="whitespace-pre-wrap max-w-md">
                                    {role.responsibilities || ''}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                        </div>
                      </div>
                  )}
                </div>

              {/* Pricing Section */}
                <div id="content-pricing" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">5. PRICING</h2>
                  
                  {/* Project Timeline Display */}
                  {sow.timeline_weeks && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                            <div>Phase</div>
                            <div>Description</div>
                            <div className="text-right">Duration</div>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                          {(() => {
                            const totalWeeks = parseFloat(sow.timeline_weeks) || 0;
                            
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
                  
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-gray-700">
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
                    <p className="text-sm text-gray-600 mt-2">
                      Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
                    </p>
                  </div>



                  {/* Pricing Display Component */}
                  <PricingDisplay
                    pricingRoles={Array.isArray(sow.pricingRoles) ? sow.pricingRoles.map(role => ({
                      role: role.role || '',
                      ratePerHour: role.rate_per_hour || 0,
                      totalHours: role.total_hours || 0,
                      totalCost: (role.rate_per_hour || 0) * (role.total_hours || 0)
                    })) : []}
                    discountType={sow.pricing?.discount_type || 'none'}
                    discountAmount={sow.pricing?.discount_amount || 0}
                    discountPercentage={sow.pricing?.discount_percentage || 0}
                    subtotal={sow.pricing?.subtotal || 0}
                    totalAmount={sow.pricing?.total_amount || 0}
                    lastCalculated={sow.pricing?.last_calculated || null}
                    pmHoursRemoved={sow.pm_hours_requirement_disabled || false}
                  />

                  
                  <p className="mb-2 text-sm text-gray-700">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
                  <p className="mb-2 text-sm text-gray-700">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
                  
                  {/* Project Details Summary section removed */}

                  {/* Billing Information */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
                      {sow.salesforceAccountId && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          From Salesforce
                        </span>
                      )}
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <dt className="font-semibold text-gray-700">Company Name:</dt>
                      <dd className="text-gray-900">{sow.template?.billing_company_name || 'N/A'}</dd>
                      
                      <dt className="font-semibold text-gray-700">Billing Contact Name:</dt>
                      <dd className="text-gray-900">{sow.template?.billing_contact_name || 'N/A'}</dd>
                      
                      <dt className="font-semibold text-gray-700">Billing Address:</dt>
                      <dd className="text-gray-900">
                        {(sow.template?.billing_address || 'N/A')
                          .split(',')
                          .map((line: string, idx: number) => (
                            <span key={idx} className="block">{line.trim()}</span>
                          ))}
                      </dd>
                      
                      <dt className="font-semibold text-gray-700">Billing Email:</dt>
                      <dd className="text-gray-900">{sow.template?.billing_email || 'N/A'}</dd>
                      
                      <dt className="font-semibold text-gray-700">Purchase Order Number:</dt>
                      <dd className="text-gray-900">{sow.template?.purchase_order_number || 'PO provided by customer'}</dd>
                      
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
              </div>

              {/* Assumptions Section */}
                <div id="content-assumptions" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">6. ASSUMPTIONS</h2>
                  <SOWAssumptionsPage 
                    customContent={sow.custom_assumptions_content}
                    isEdited={sow.assumptions_content_edited}
                  />
                </div>
            

                            {/* Version History */}
                {versions.length > 1 && (
                  <div id="version-history" className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Version History</h2>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {versions.map((version) => (
                          <li key={version.id}>
                            <Link
                              href={`/sow/${version.id}`}
                              className="block hover:bg-gray-50"
                            >
                              <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                      Version {version.version}
                                    </p>
                                    {version.isLatest && (
                                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-2 flex-shrink-0 flex">
                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                      {new Date(version.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )} {/* Close sow-content-to-export */}
              </div> {/* Close lg:col-span-2 */}

              {/* Status and Actions - Right Column (1/3 width) */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
                  <div className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">SOW Status</h3>
                    
                    {sow.status === 'draft' && (
                      <>
                        <p className="text-gray-600 mb-4">
                          This SOW is currently in draft status. Submit it for review when ready.
                        </p>
                        
                        {/* Validation check and button - anyone can submit */}
                        <ValidationSubmitButton sow={sow} />
                      </>
                    )}
                    
                    {sow.status === 'in_review' && (
                      <>
                        <p className="text-blue-600 mb-4">
                          This SOW is currently under review.
                        </p>
                        
                        {/* Show approval component only for managers/admins */}
                        {isAdmin ? (
                          <SimpleApproval
                            sowId={sow.id}
                            sowTitle={sow.sowTitle || 'Untitled SOW'}
                            clientName={sow.clientName || 'Unknown Client'}
                            onStatusChange={() => window.location.reload()}
                          />
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm text-blue-800">
                                <strong>Waiting for approval:</strong> This SOW has been submitted for review and is waiting for a Manager or Admin to approve it.
                              </p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded p-3">
                              <p className="text-xs text-gray-600">
                                <strong>Approval Process:</strong> Once approved, this SOW will be ready for client signature. If rejected, it will return to draft status with feedback for improvements.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {sow.status === 'approved' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-green-600 mb-2">
                            This SOW has been approved.
                          </p>
                          {sow.approved_at && (
                            <p className="text-sm text-gray-600">
                              Approved on: {new Date(sow.approved_at).toLocaleDateString()}
                            </p>
                          )}
                          {sow.approval_comments && (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <p className="text-sm text-green-800">
                                <strong>Approval Comments:</strong> {sow.approval_comments}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* New Revision Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/sow/${sow.id}/version`, {
                                  method: 'POST'
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to create new version');
                                }
                                
                                const newVersion = await response.json();
                                window.location.href = `/sow/${newVersion.id}`;
                              } catch (err) {
                                console.error('Error creating new version:', err);
                                alert('Failed to create new version. Please try again.');
                              }
                            }}
                            className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mb-3"
                          >
                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create New Revision
                          </button>
                        </div>

                        {/* Save to Google Drive Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex gap-3">
                            <SaveToGoogleDrive 
                              sowId={sow.id}
                              customerName={sow.clientName || 'Unknown Customer'}
                              sowTitle={sow.sowTitle || 'Untitled SOW'}
                            />
                            

                          </div>
                        </div>
                      </div>
                    )}
                    
                    {sow.status === 'draft' && sow.rejected_at && (
                      <div className="space-y-2">
                        <p className="text-red-600 mb-2">
                          This SOW was rejected and returned to draft.
                        </p>
                        <p className="text-sm text-gray-600">
                          Rejected on: {new Date(sow.rejected_at).toLocaleDateString()}
                        </p>
                        {sow.approval_comments && (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-800">
                              <strong>Rejection Comments:</strong> {sow.approval_comments}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="mt-6">
                      <SOWComments sowId={sow.id} />
                    </div>
                  </div>
                </div>
              </div>
              

            </div> {/* Close grid */}
            
            {/* Download Progress Modal */}
            {showDownloadModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
                  {/* Status Icon */}
                  {downloadStatus === 'generating' && (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  )}
                  {downloadStatus === 'downloading' && (
                    <div className="w-12 h-12 mx-auto mb-4">
                      <svg className="w-full h-full text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                  )}
                  {downloadStatus === 'success' && (
                    <div className="w-12 h-12 mx-auto mb-4">
                      <svg className="w-full h-full text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {downloadStatus === 'error' && (
                    <div className="w-12 h-12 mx-auto mb-4">
                      <svg className="w-full h-full text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {downloadStatus === 'generating' && 'Generating PDF...'}
                    {downloadStatus === 'downloading' && 'Downloading PDF...'}
                    {downloadStatus === 'success' && 'Download Complete!'}
                    {downloadStatus === 'error' && 'Download Failed'}
                  </h3>
                  
                  {/* Status Message */}
                  <p className="text-gray-600 mb-4">
                    {downloadStatus === 'generating' && 'Please wait while we prepare your document...'}
                    {downloadStatus === 'downloading' && 'Your PDF is now downloading to your device.'}
                    {downloadStatus === 'success' && 'Your SOW PDF has been downloaded successfully!'}
                    {downloadStatus === 'error' && 'There was an error generating your PDF. Please try again.'}
                  </p>
                  
                  {/* Progress Bar for Generating */}
                  {downloadStatus === 'generating' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  )}
                  
                  {/* Progress Bar for Downloading */}
                  {downloadStatus === 'downloading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                  )}
                  
                  {/* Close Button for Error State */}
                  {downloadStatus === 'error' && (
                    <button
                      onClick={() => {
                        setShowDownloadModal(false);
                        setDownloadingPDF(false);
                        setDownloadStatus('idle');
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Close
                    </button>
                  )}
                  
                  {/* Auto-close notice for success */}
                  {downloadStatus === 'success' && (
                    <p className="text-sm text-gray-500">This modal will close automatically...</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
} 