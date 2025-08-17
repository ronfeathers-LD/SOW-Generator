'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';

interface ClientRole {
  role: string;
  responsibilities: string;
  name: string;
  email: string;
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

  
  // Custom content tracking
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_roles_content?: string;
  custom_deliverables_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  roles_content_edited?: boolean;
  deliverables_content_edited?: boolean;
}



export default function PublicSOWPage() {
  const params = useParams();
  const [sow, setSOW] = useState<SOW | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/public/sow/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOW');
        }
        const data = await response.json();
        
        // Parse JSON fields with safe defaults
        const parsedData = {
          ...data,
          deliverables: data.deliverables ? data.deliverables.split('\n').filter(Boolean) : [],
          projectDescription: data.objectives?.description || '',
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
                const roleObj = role as { role?: string; ratePerHour?: number; rate?: number; totalHours?: number; hours?: number };
                return {
                  role: roleObj.role || '',
                  ratePerHour: roleObj.ratePerHour || roleObj.rate || 0,
                  totalHours: roleObj.totalHours || roleObj.hours || 0,
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
          },

          companyLogo: data.companyLogo || '',
          clientSignature: data.clientSignature || undefined,
          clientSignerName: data.clientSignerName || undefined,
          customer_signature_name_2: data.customer_signature_name_2 || undefined,
          customer_signature_2: data.customer_signature_2 || undefined,
          customer_email_2: data.customer_email_2 || undefined,

          custom_intro_content: data.custom_intro_content || undefined,
          custom_scope_content: data.custom_scope_content || undefined,
          custom_roles_content: data.custom_roles_content || undefined,
          custom_deliverables_content: data.custom_deliverables_content || undefined,
          intro_content_edited: data.intro_content_edited || false,
          scope_content_edited: data.scope_content_edited || false,
          roles_content_edited: data.roles_content_edited || false,
          deliverables_content_edited: data.deliverables_content_edited || false
        };
        
        setSOW(parsedData);
      } catch (err) {
        console.error('Error fetching SOW:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!sow) {
    return <div>SOW not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SOWTitlePage 
          clientName={sow.clientName}
          clientLogo={sow.companyLogo}
          clientSignature={sow.clientSignature}
          clientSignature2={sow.customer_signature_name_2 ? {
            name: sow.customer_signature_name_2,
            title: sow.customer_signature_2 || '',
            email: sow.customer_signature_2 || '',
            date: ''
          } : undefined}
          leandataSignature={{
            name: 'Agam Vasani',
            title: 'VP Customer Success',
            email: 'agam.vasani@leandata.com'
          }}
        />
        <SOWIntroPage 
          clientName={sow.clientName}
          customContent={sow.custom_intro_content}
          isEdited={sow.intro_content_edited}
        />
        <SOWScopePage 
          customContent={sow.custom_scope_content}
          customDeliverablesContent={sow.custom_deliverables_content}
          isEdited={sow.scope_content_edited || sow.deliverables_content_edited}
        />


        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">ROLES AND RESPONSIBILITIES</h2>
          <SOWRolesPage 
            customContent={sow.custom_roles_content}
            isEdited={sow.roles_content_edited}
          />
          
          {/* Client Roles Table */}
          {Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Client Team Roles</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role (Title)</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Responsibilities</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sow.clientRoles.map((role, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{role.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{role.role || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{role.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-700">
                          <div className="whitespace-pre-wrap max-w-md">
                            {role.responsibilities || 'N/A'}
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
      </div>
    </div>
  );
} 