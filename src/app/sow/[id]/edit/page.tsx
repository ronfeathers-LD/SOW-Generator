'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SOWForm from '@/components/SOWForm';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';

export default function EditSOWPage() {
  const params = useParams();
  const router = useRouter();
  const [sow, setSOW] = useState<SOWData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // 🔍 LOG: Raw API response data
          console.log('🔍 EDIT PAGE - Raw API Response:', {
            sowId: data.id,
            sowTitle: data.template?.sow_title,
            clientName: data.template?.client_name,
            account_segment: data.account_segment,
            salesforce_account_id: data.salesforce_account_id,
            salesforce_account_owner_name: data.salesforce_account_owner_name,
            salesforce_account_owner_email: data.salesforce_account_owner_email
          });
          
          // Check if SOW is editable
          const status = data.status;
          
          if (status === 'approved' || status === 'rejected') {
            // Redirect to view page with error message
            router.push(`/sow/${params.id}?error=immutable`);
            return;
          }
          
          // SOW data loaded for edit
          
          // Transform the data to match the form structure
          const transformedData: SOWData = {
            id: data.id,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
            // Include salesforce_account_id
            salesforce_account_id: data.salesforce_account_id,
            // Include Salesforce account owner information
            salesforce_account_owner_name: data.salesforce_account_owner_name,
            salesforce_account_owner_email: data.salesforce_account_owner_email,
            // Include salesforce_contact_id
            salesforce_contact_id: data.salesforce_contact_id,
            // Include account segment
            account_segment: data.account_segment,
            // Use the template data from the API response, merging with top-level fields
            template: {
              ...data.template,
              // Ensure client_name is available
              client_name: data.client_name || data.template?.client_name || '',
              // Include other template fields
              sow_title: data.sow_title || data.template?.sow_title || '',
              lean_data_name: data.leandata_name || data.template?.lean_data_name || 'None Selected',
              lean_data_title: data.leandata_title || data.template?.lean_data_title || 'None Selected',
              lean_data_email: data.leandata_email || data.template?.lean_data_email || 'None Selected',
            },
            // Required properties for SOWData interface
            header: {
              company_logo: data.company_logo || '',
              client_name: data.client_name || data.template?.client_name || '',
              sow_title: data.sow_title || data.template?.sow_title || '',
            },
            client_signature: {
              name: data.client_name || data.template?.client_name || '',
              title: data.client_title || '',
              email: data.client_email || '',
              signature_date: data.signature_date ? new Date(data.signature_date) : new Date(),
            },
            objectives: {
              description: data.objectives?.description || '',
              key_objectives: data.objectives?.key_objectives || [''],
              avoma_url: data.objectives?.avoma_url || '',
              avoma_transcription: data.objectives?.avoma_transcription || '',
              avoma_recordings: data.objectives?.avoma_recordings || [],
            },
            scope: {
              deliverables: data.deliverables || '',
              timeline: {
                duration: data.duration || '',
              },
            },
            roles: {
              client_roles: data.client_roles || [],
            },
            pricing: {
              roles: data.pricingRoles || [],
              billing: data.billing_info || {
                companyName: '',
                billingContact: '',
                billingAddress: '',
                billingEmail: '',
                poNumber: '',
                paymentTerms: '',
                currency: '',
              },
              // Include pricing configuration fields
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
            // Set selectedAccount immediately if we have salesforce_account_id
            selectedAccount: data.salesforce_account_id ? {
              Id: data.salesforce_account_id,
              Name: data.client_name || data.template?.client_name || '',
              // Add other required fields with defaults
              BillingStreet: '',
              BillingCity: '',
              BillingState: '',
              BillingPostalCode: '',
              BillingCountry: '',
              Billing_Contact__c: '',
              Billing_Email__c: '',
              Employee_Band__c: data.account_segment || '', // Include account segment
            } as SalesforceAccount : undefined,
            // Include custom content fields
            custom_intro_content: data.custom_intro_content || null,
            custom_scope_content: data.custom_scope_content || null,
            custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || null,
            custom_assumptions_content: data.custom_assumptions_content || null,
            custom_project_phases_content: data.custom_project_phases_content || null,
            custom_deliverables_content: data.custom_deliverables_content || null,
            custom_objective_overview_content: data.custom_objective_overview_content || null,
            custom_key_objectives_content: data.custom_key_objectives_content || null,
            intro_content_edited: data.intro_content_edited || false,
            scope_content_edited: data.scope_content_edited || false,
            objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
            assumptions_content_edited: data.assumptions_content_edited || false,
            project_phases_content_edited: data.project_phases_content_edited || false,
            deliverables_content_edited: data.deliverables_content_edited || false,
            objective_overview_content_edited: data.objective_overview_content_edited || false,
            key_objectives_content_edited: data.key_objectives_content_edited || false,
          };

          // 🔍 LOG: Transformed data being set
          console.log('🔍 EDIT PAGE - Transformed Data:', {
            sowId: transformedData.id,
            sowTitle: transformedData.template?.sow_title,
            clientName: transformedData.template?.client_name,
            account_segment: transformedData.account_segment,
            salesforce_account_id: transformedData.salesforce_account_id,
            salesforce_account_owner_name: transformedData.salesforce_account_owner_name,
            salesforce_account_owner_email: transformedData.salesforce_account_owner_email,
            selectedAccount: transformedData.selectedAccount ? {
              Id: transformedData.selectedAccount.Id,
              Name: transformedData.selectedAccount.Name,
              Employee_Band__c: transformedData.selectedAccount.Employee_Band__c
            } : null
          });

          setSOW(transformedData);
        } else {
          console.error('Failed to fetch SOW:', response.statusText);
          router.push('/sow?error=not-found');
        }
      } catch (error) {
        console.error('Error fetching SOW:', error);
        router.push('/sow?error=fetch-failed');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SOW...</p>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">SOW not found</p>
        </div>
      </div>
    );
  }

  return <SOWForm initialData={sow} />;
} 