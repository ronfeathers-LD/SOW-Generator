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
import { useSession } from 'next-auth/react';
import { getStatusColor, getStatusLabel } from '@/lib/utils/statusUtils';

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
        console.log('✅ SOW submitted for review successfully!');
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
  };

  // Approval/Rejection fields
  approved_at?: string;
  rejected_at?: string;
  approval_comments?: string;
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
  const [creatingVersion, setCreatingVersion] = useState(false);

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

          companyLogo: data.header?.company_logo || data.companyLogo || '',
          clientName: data.template?.client_name || data.client_name || data.header?.client_name || '',
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

  const handleCreateVersion = async () => {
    try {
      setCreatingVersion(true);
      const response = await fetch(`/api/sow/${params.id}/version`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create new version');
      }
      
      const newVersion = await response.json();
      router.push(`/sow/${newVersion.id}`);
    } catch (err) {
      console.error('Error creating new version:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new version');
    } finally {
      setCreatingVersion(false);
    }
  };

  const isEditable = useMemo(() => {
    if (!sow) return false;
    // Only draft SOWs can be edited - approved/rejected versions are immutable
    return sow.status === 'draft';
  }, [sow]);

  const canCreateNewVersion = useMemo(() => {
    if (!sow) return false;
    // Can create new version from approved or rejected SOWs
    return sow.status === 'approved' || sow.status === 'rejected';
  }, [sow]);









  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SOW...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {sow && (
          <>
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{sow.sowTitle}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-500">Version {sow.version}</p>
                  {(sow.status === 'approved' || sow.status === 'rejected') && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      Immutable
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sow.status)}`}>
                  {getStatusLabel(sow.status)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-8 flex justify-end space-x-4">
              {isEditable && (
                <Link
                  href={`/sow/${params.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit SOW
                </Link>
              )}
              {canCreateNewVersion && (
                <button
                  onClick={handleCreateVersion}
                  disabled={creatingVersion}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {creatingVersion ? 'Creating...' : 'Create New Version'}
                </button>
              )}
              {!isEditable && !canCreateNewVersion && sow.status === 'in_review' && (
                <div className="text-sm text-gray-600 italic">
                  SOW is in review - use the Approval Workflow to approve or reject
                </div>
              )}
              {canCreateNewVersion && (
                <div className="text-sm text-gray-600 italic">
                  This version is {sow.status === 'approved' ? 'approved' : 'rejected'} and cannot be modified. Create a new version to make changes.
                </div>
              )}

            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main SOW Content - Left Column (2/3 width) */}
              <div className="lg:col-span-2">
                <div id="sow-content-to-export">
              {/* Title Page Section */}
                <div id="title-page" className="mb-12">
                  <SOWTitlePage
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    clientLogo={sow.companyLogo}
                    clientSignature={{
                          name: findSignatory(salesforceData?.contacts_data)?.name || sow.clientSignerName || sow.clientSignature?.name || 'Not Entered',
    title: findSignatory(salesforceData?.contacts_data)?.title || sow.clientSignature?.title || sow.clientTitle || 'Title Not Entered',
    email: findSignatory(salesforceData?.contacts_data)?.email || sow.clientSignature?.email || sow.clientEmail || 'EmailNot Entered',
                      date: sow.signatureDate || ''
                    }}
                    clientSignature2={sow.customer_signature_name_2 ? {
                      name: sow.customer_signature_name_2,
                      title: sow.customer_signature_2 || '',
                      email: sow.customer_email_2 || '',
                      date: ''
                    } : undefined}
                    leandataSignature={{
                      name: "Agam Vasani",
                      title: "VP Customer Success",
                      email: "agam.vasani@leandata.com"
                    }}
                  />
                </div>


              {/* SOW Intro Page Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
                  <SOWIntroPage 
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    customContent={sow.custom_intro_content}
                    isEdited={sow.intro_content_edited}
                  />
                </div>


              {/* SOW Objectives Page Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
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
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
                  <SOWScopePage 
                    customContent={sow.custom_scope_content}
                    customDeliverablesContent={sow.custom_deliverables_content}
                    isEdited={sow.scope_content_edited}
                  />
                </div>

              {/* SOW Out of Scope Page Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">3. OUT OF SCOPE</h2>
                  <SOWOutOfScopePage 
                    customContent={sow.custom_out_of_scope_content}
                    isEdited={sow.out_of_scope_content_edited}
                  />
                </div>

              {/* SOW Project Phases Page Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
                  <div className="formatSOWTable">
                  <SOWProjectPhasesPage 
                    customContent={sow.custom_project_phases_content}
                    isEdited={sow.project_phases_content_edited}
                  />
                  </div>
                </div>

              {/* Roles and Responsibilities Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>
                  <div className="formatSOWTable">
                  <SOWRolesPage 
                    customContent={sow.custom_roles_content}
                    isEdited={sow.roles_content_edited}
                  />
                  </div>
                  
                  {/* Client Roles Table */}
                  {Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
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
                  )}
                </div>

              {/* Pricing Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">5. PRICING</h2>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-gray-700">
                      The tasks above will be completed on a <strong>time and material basis</strong>, using the LeanData standard workday of 8 hours for a duration of <strong>{sow.timeline_weeks ? `${sow.timeline_weeks} weeks` : 'N/A'}</strong>.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
                    </p>
                  </div>
                  

                  
                  {/* Pricing Display Component */}
                  <PricingDisplay
                    pricingRoles={Array.isArray(sow.pricing.roles) ? sow.pricing.roles.map(role => ({
                      role: role.role || '',
                      ratePerHour: role.ratePerHour || 0,
                      totalHours: role.totalHours || 0,
                      totalCost: (role.ratePerHour || 0) * (role.totalHours || 0)
                    })) : []}
                    discountType={sow.pricing?.discount_type || 'none'}
                    discountAmount={sow.pricing?.discount_amount || 0}
                    discountPercentage={sow.pricing?.discount_percentage || 0}
                    subtotal={sow.pricing?.subtotal || 0}
                    totalAmount={sow.pricing?.total_amount || 0}
                    autoCalculated={sow.pricing?.auto_calculated || false}
                    lastCalculated={sow.pricing?.last_calculated || null}
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
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
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
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        sow.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                        sow.status === 'approved' ? 'bg-green-100 text-green-800' :
                        sow.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sow.status?.toUpperCase() || 'DRAFT'}
                      </span>
                    </div>
                    
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
                  </div>
                </div>
              </div>
              

            </div> {/* Close grid */}
          </>
        )}
      </div>
    </div>
  );
} 