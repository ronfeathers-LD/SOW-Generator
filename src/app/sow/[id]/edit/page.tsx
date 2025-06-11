'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SOWForm from '@/components/SOWForm';
import { SOWData } from '@/types/sow';

export default function EditSOWPage() {
  const params = useParams();
  const router = useRouter();
  const [sow, setSOW] = useState<SOWData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOW');
        }
        const data = await response.json();
        
        // Transform the data to match the form structure
        const transformedData: SOWData = {
          id: data.id,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          header: {
            companyLogo: data.companyLogo || '',
            clientName: data.clientName || '',
            sowTitle: data.sowTitle || '',
            effectiveDate: new Date(data.effectiveDate),
          },
          clientSignature: {
            name: data.clientName || '',
            title: data.clientTitle || '',
            email: data.clientEmail || '',
            signatureDate: new Date(data.signatureDate),
          },
          scope: {
            projectDescription: data.projectDescription || '',
            deliverables: data.deliverables || '',
            timeline: {
              startDate: new Date(data.startDate),
              duration: data.duration || '',
            },
          },
          roles: {
            clientRoles: data.clientRoles || [{
              role: '',
              name: '',
              contact: '',
              responsibilities: '',
            }],
          },
          pricing: {
            roles: data.pricingRoles || [{
              role: '',
              ratePerHour: 0,
              totalHours: 0,
            }],
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
          assumptions: {
            accessRequirements: data.accessRequirements || '',
            travelRequirements: data.travelRequirements || '',
            workingHours: data.workingHours || '',
            testingResponsibilities: data.testingResponsibilities || '',
          },
          addendums: data.addendums || [{
            title: '',
            content: '',
            risks: [''],
            mitigations: [''],
            supportScope: {
              supported: [''],
              notSupported: [''],
            },
          }],
          deliverables: data.deliverables || '',
          clientSignerName: data.clientSignerName || '',
        };
        
        setSOW(transformedData);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Edit Statement of Work</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update the SOW details below
          </p>
        </div>
        
        <div className="mt-8">
          <SOWForm initialData={sow} />
        </div>
      </div>
    </div>
  );
} 