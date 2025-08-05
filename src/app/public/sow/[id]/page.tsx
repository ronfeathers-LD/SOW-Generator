'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';

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
  
  // Custom content tracking
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_roles_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  roles_content_edited?: boolean;
}

function safeJsonParse<T>(value: any, defaultValue: T): T {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value as T;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    if (typeof value === 'string') return value as unknown as T;
    console.warn('Failed to parse JSON:', value);
    return defaultValue;
  }
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
          projectDescription: data.objectives?.description || data.scope?.project_description || data.project_description || '',
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

          companyLogo: data.companyLogo || '',
          clientSignature: data.clientSignature || undefined,
          clientSignerName: data.clientSignerName || undefined,
          custom_intro_content: data.custom_intro_content || undefined,
          custom_scope_content: data.custom_scope_content || undefined,
          custom_roles_content: data.custom_roles_content || undefined,
          intro_content_edited: data.intro_content_edited || false,
          scope_content_edited: data.scope_content_edited || false,
          roles_content_edited: data.roles_content_edited || false
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
          deliverables={sow.deliverables}
          projectDescription={sow.projectDescription}
          customContent={sow.custom_scope_content}
          isEdited={sow.scope_content_edited}
        />
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">ROLES AND RESPONSIBILITIES</h2>
          <SOWRolesPage 
            customContent={sow.custom_roles_content}
            isEdited={sow.roles_content_edited}
          />
        </div>
      </div>
    </div>
  );
} 