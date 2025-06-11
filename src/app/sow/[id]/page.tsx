'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ClientRole {
  role: string;
  responsibilities: string[];
  name: string;
  email: string;
}

interface SOW {
  id: string;
  clientName: string;
  sowTitle: string;
  effectiveDate: string;
  clientTitle: string;
  clientEmail: string;
  signatureDate: string;
  projectDescription: string;
  deliverables: string[];
  startDate: string;
  duration: string;
  clientRoles: ClientRole[];
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
  addendums: Array<{
    title: string;
    description: string;
    date: string;
  }>;
  version: number;
  companyLogo: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  clientSignerName?: string;
}

interface SOWVersion {
  id: string;
  version: number;
  isLatest: boolean;
  createdAt: string;
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

export default function SOWDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPDF = searchParams.get('pdf') === '1';
  const [sow, setSOW] = useState<SOW | null>(null);
  const [versions, setVersions] = useState<SOWVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);

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
          addendums: safeJsonParse(data.addendums, []),
          companyLogo: data.companyLogo || '',
          clientSignature: data.clientSignature || undefined,
          clientSignerName: data.clientSignerName || undefined
        };
        
        setSOW(parsedData);

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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Action Buttons */}
        {!isPDF && (
          <div id="action-buttons" className="flex justify-end items-center mb-8">
            <div className="flex items-center space-x-4">
              <a
                href={`/api/sow/${sow.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Download PDF
              </a>
              <Link
                href={`/sow/${sow.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit SOW
              </Link>
              <button
                onClick={handleCreateVersion}
                disabled={creatingVersion}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {creatingVersion ? 'Creating...' : 'Create New Version'}
              </button>
            </div>
          </div>
        )}

        {/* Main SOW Content to Export */}
        <div id="sow-content-to-export">
          {/* Title Page */}
          <div id="title-page" className="mb-12">
            <SOWTitlePage
              clientName={sow.clientName}
              clientLogo={sow.companyLogo}
              clientSignature={{
                name: sow.clientSignerName || sow.clientSignature?.name || 'Not Entered',
                title: sow.clientSignature?.title || sow.clientTitle || 'Not Entered',
                email: sow.clientSignature?.email || sow.clientEmail || 'Not Entered',
                date: sow.signatureDate || 'Not Entered'
              }}
              leandataSignature={{
                name: "Agam Vasani",
                title: "VP Customer Success",
                email: "agam.vasani@leandata.com"
              }}
            />
          </div>

          {/* SOW Intro Page */}
          <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
            <h2 className="text-3xl font-bold text-center mb-6">INTRODUCTION</h2>
            <SOWIntroPage clientName={sow.clientName} />
          </div>

          {/* SOW Scope Page */}
          <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
            <h2 className="text-3xl font-bold text-center mb-6">SCOPE</h2>
            <SOWScopePage deliverables={sow.deliverables} />
          </div>

          {/* Roles and Responsibilities */}
          <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
            <h2 className="text-3xl font-bold text-center mb-6">ROLES AND RESPONSIBILITIES</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">Responsibilities</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Account Executive</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Point of contact for account-level needs and services expansion. Liaison to facilitate meetings and project manage services/artifacts</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Project Manager</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Manage timelines, project risk and communications, track and resolve issues</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Solution Engineer</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Develop custom code, if any, to fulfill the requirements. Certified LeanData Consultant.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
            <h2 className="text-3xl font-bold text-center mb-6">PRICING</h2>
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

          {/* Assumptions Section */}
          <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
            <h2 className="text-3xl font-bold text-center mb-6">ASSUMPTIONS</h2>
            <p className="mb-4">The following are the assumptions as part of the SOW:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>LeanData Professional Services will require access to the customer's SFDC's sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.</li>
              <li>For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.</li>
              <li>If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.</li>
              <li>All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.</li>
              <li>Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations.</li>
            </ul>
          </div>
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
      </div>
    </div>
  );
} 