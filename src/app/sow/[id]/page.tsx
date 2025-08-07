'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import SOWProjectPhasesPage from '@/components/sow/SOWProjectPhasesPage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';
import { useSession } from 'next-auth/react';

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
    };
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
  customer_signature_date_2?: string;
  // Project Details
  products?: string[];
  number_of_units?: string;
  regions?: string;
  salesforce_tenants?: string;
  timeline_weeks?: string;
  project_start_date?: string;
  project_end_date?: string;
  units_consumption?: string;
  
  // Custom content tracking
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_assumptions_content?: string;
  custom_project_phases_content?: string;
  custom_roles_content?: string;
  custom_deliverables_content?: string;
  custom_objective_overview_content?: string;
  custom_key_objectives_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  project_phases_content_edited?: boolean;
  roles_content_edited?: boolean;
  deliverables_content_edited?: boolean;
  objective_overview_content_edited?: boolean;
  key_objectives_content_edited?: boolean;
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
  opportunity_data?: any;
}

function safeJsonParse<T>(value: any, defaultValue: T): T {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value as T;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    // If parsing fails, return the value as is if it's a string
    if (typeof value === 'string') return value as unknown as T;
    console.warn('Failed to parse JSON:', value);
    return defaultValue;
  }
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
  const [deleting, setDeleting] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOW');
        }
        const data = await response.json();
        
        // Parse JSON fields with safe defaults
        const parsedData = {
          ...data,
          deliverables: data.deliverables ? data.deliverables.split('\n').filter(Boolean) : [],
          projectDescription: data.objectives?.description || data.scope?.project_description || data.project_description || '',
          keyObjectives: Array.isArray(data.objectives?.key_objectives) ? data.objectives.key_objectives : [],
          clientRoles: Array.isArray(data.clientRoles) ? data.clientRoles.map((role: any) => ({
            role: role.role || '',
            name: role.name || '',
            email: role.email || '',
            responsibilities: role.responsibilities || ''
          })) : [],
          pricing: {
            roles: Array.isArray(data.pricingRoles) ? data.pricingRoles.map((role: any) => ({
              role: role.role || '',
              ratePerHour: role.ratePerHour || role.rate || 0,
              totalHours: role.totalHours || role.hours || 0,
            })) : [],
            billing: data.billingInfo || {
              companyName: '',
              billingContact: '',
              billingAddress: '',
              billingEmail: '',
              poNumber: '',
              paymentTerms: '',
              currency: '',
            },
          },

          companyLogo: data.header?.company_logo || data.companyLogo || '',
          clientName: data.template?.customer_name || data.client_name || data.header?.client_name || '',
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
          customer_signature_date_2: data.template?.customer_signature_date_2 || undefined,
          salesforceAccountId: data.salesforce_account_id || undefined,
          custom_intro_content: data.custom_intro_content || undefined,
          custom_scope_content: data.custom_scope_content || undefined,
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
          project_start_date: data.template?.start_date || data.project_start_date || '',
          project_end_date: data.template?.end_date || data.project_end_date || '',
          units_consumption: data.template?.units_consumption || data.units_consumption || '',
          intro_content_edited: data.intro_content_edited || false,
          scope_content_edited: data.scope_content_edited || false,
          objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
          assumptions_content_edited: data.assumptions_content_edited || false,
          project_phases_content_edited: data.project_phases_content_edited || false,
          roles_content_edited: data.roles_content_edited || false,
          deliverables_content_edited: data.deliverables_content_edited || false,
          objective_overview_content_edited: data.objective_overview_content_edited || false,
          key_objectives_content_edited: data.key_objectives_content_edited || false
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
    return sow.status === 'draft';
  }, [sow]);

  const handleStatusChange = async (newStatus: SOW['status']) => {
    try {
      const response = await fetch(`/api/sow/${params.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          version: sow?.version 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedSOW = await response.json();
      
      // Ensure the SOW data structure is complete
      setSOW({
        ...sow!,
        ...updatedSOW,
        pricing: {
          ...sow!.pricing,
          ...updatedSOW.pricing,
          roles: sow!.pricing.roles,
          billing: {
            ...sow!.pricing.billing,
            ...updatedSOW.pricing?.billing
          }
        },
        deliverables: sow!.deliverables,
        clientRoles: sow!.clientRoles
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const getStatusColor = (status: SOW['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: SOW['status']) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'in_review':
        return 'In Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };



  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this SOW? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/sow/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete SOW');
      }

      // Redirect to the SOW list page
      router.push('/sow');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SOW');
      setDeleting(false);
    }
  };

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

  if (!sow) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">SOW not found</div>
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
                <p className="mt-1 text-sm text-gray-500">Version {sow.version}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sow.status)}`}>
                  {getStatusLabel(sow.status)}
                </span>
                {isAdmin && (
                  <div className="flex space-x-2">
                    {sow.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange('in_review')}
                        className="px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      >
                        Submit for Review
                      </button>
                    )}
                    {sow.status === 'in_review' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('approved')}
                          className="px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200"
                        >
                          Approve Version {sow.version}
                        </button>
                        <button
                          onClick={() => handleStatusChange('rejected')}
                          className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Reject Version {sow.version}
                        </button>
                      </>
                    )}
                  </div>
                )}
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
              {!isEditable && sow.status !== 'approved' && (
                <button
                  onClick={handleCreateVersion}
                  disabled={creatingVersion}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {creatingVersion ? 'Creating...' : 'Create New Version'}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete SOW'}
              </button>
            </div>

            {/* Main SOW Content to Export */}
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
                      date: sow.customer_signature_date_2 || ''
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
                      start_date: sow.project_start_date ? new Date(sow.project_start_date) : new Date(sow.startDate),
                      end_date: sow.project_end_date ? new Date(sow.project_end_date) : null,
                      units_consumption: sow.units_consumption || ''
                    }}
                  />
                </div>



              {/* SOW Scope Page Section */}
                <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
                  <SOWScopePage 
                    deliverables={sow.deliverables} 
                    projectDescription={sow.projectDescription}
                    customContent={sow.custom_scope_content}
                    customDeliverablesContent={sow.custom_deliverables_content}
                    isEdited={sow.scope_content_edited || sow.deliverables_content_edited}
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
                  <h2 className="text-3xl font-bold  mb-6">5. PRICING</h2>
                  <p className="mb-4 text-center">
                    The tasks above will be completed on a time and material basis, using the LeanData standard workday of 8 hours for a duration of {sow.duration || 'N/A'}.
                  </p>
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-200 border">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">LeanData Role</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rate/Hr</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Hours</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total USD</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.isArray(sow.pricing.roles) && sow.pricing.roles.map((role, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{role.role}</td>
                            <td className="px-6 py-4 whitespace-nowrap">${role.ratePerHour?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{role.totalHours}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{role.ratePerHour && role.totalHours ? (role.ratePerHour * role.totalHours).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mb-2 text-sm text-gray-700">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
                  <p className="mb-2 text-sm text-gray-700">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-8 text-sm">
                    <dt className="font-semibold">Company Name:</dt>
                    <dd>{sow.pricing?.billing?.companyName || 'N/A'}</dd>
                    <dt className="font-semibold">Billing Contact Name:</dt>
                    <dd>{sow.pricing?.billing?.billingContact || 'N/A'}</dd>
                    <dt className="font-semibold">Billing Address:</dt>
                    <dd>
                      {(sow.pricing?.billing?.billingAddress || 'N/A')
                        .split(',')
                        .map((line, idx) => (
                          <span key={idx} className="block">{line.trim()}</span>
                        ))}
                    </dd>
                    <dt className="font-semibold">Billing Email:</dt>
                    <dd>{sow.pricing?.billing?.billingEmail || 'N/A'}</dd>
                    <dt className="font-semibold">Purchase Order Number:</dt>
                    <dd>{sow.pricing?.billing?.poNumber || 'PO provided by customer'}</dd>
                    <dt className="font-semibold">Payment Terms:</dt>
                    <dd>{sow.pricing?.billing?.paymentTerms || 'N/A'}</dd>
                    <dt className="font-semibold">Currency:</dt>
                    <dd>{sow.pricing?.billing?.currency || 'N/A'}</dd>
                  </dl>
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
            

            {/* SOW Content */}
            <div id="sow-content" className="mt-12">
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 