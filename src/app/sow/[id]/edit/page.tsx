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
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
          // Template structure mapping
          template: {
            // Header Information
            sow_title: data.sow_title || 'Statement of Work for LeanData Implementation',
            company_logo: data.company_logo || '',
            
            // Customer Information
            customer_name: data.client_name || '',
            customer_signature_name: data.client_signer_name || '',
            customer_signature: data.client_title || '',
            customer_email: data.client_email || '',
            customer_signature_date: data.signature_date ? new Date(data.signature_date) : null,
            
            // LeanData Information
            lean_data_name: data.leandata_name || 'Agam Vasani',
            lean_data_title: data.leandata_title || 'VP Customer Success',
            lean_data_email: data.leandata_email || 'agam.vasani@leandata.com',
            lean_data_signature_name: data.leandata_name || 'Agam Vasani',
            lean_data_signature: '',
            lean_data_signature_date: null,
            
            // Project Details
            products: 'Matching/Routing',
            number_of_units: '125',
            regions: '1',
            salesforce_tenants: '2',
            timeline_weeks: '8',
            
            // Billing Information
            billing_company_name: '',
            billing_contact_name: '',
            billing_address: '',
            billing_email: '',
            purchase_order_number: '',
            
            // Salesforce Opportunity Information
            opportunity_id: data.opportunity_id || '',
            opportunity_name: data.opportunity_name || '',
            opportunity_amount: data.opportunity_amount || undefined,
            opportunity_stage: data.opportunity_stage || '',
            opportunity_close_date: data.opportunity_close_date || undefined,
          },
          objectives: {
            description: '',
            key_objectives: [''],
          },
          header: {
            company_logo: data.company_logo || '',
            client_name: data.client_name || '',
            sow_title: data.sow_title || '',
          },
          client_signature: {
            name: data.client_name || '',
            title: data.client_title || '',
            email: data.client_email || '',
            signature_date: new Date(data.signature_date),
          },
          scope: {
            project_description: data.project_description || '',
            deliverables: data.deliverables || '',
            timeline: {
              start_date: new Date(data.start_date),
              duration: data.duration || '',
            },
          },
          roles: {
            client_roles: data.client_roles || [{
              role: '',
              name: '',
              contact: '',
              responsibilities: '',
            }],
          },
          pricing: {
            roles: data.pricing_roles || [{
              role: '',
              ratePerHour: 0,
              totalHours: 0,
            }],
            billing: data.billing_info || {
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
            accessRequirements: data.access_requirements || '',
            travelRequirements: data.travel_requirements || '',
            workingHours: data.working_hours || '',
            testingResponsibilities: data.testing_responsibilities || '',
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
          clientSignerName: data.client_signer_name || '',
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