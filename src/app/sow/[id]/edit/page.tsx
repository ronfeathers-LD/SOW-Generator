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


  useEffect(() => {
    const fetchSOW = async () => {
      
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          
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
            // Include salesforce_contact_id
            salesforce_contact_id: data.salesforce_contact_id,
            // Include selected account information if available
            selectedAccount: data.salesforce_account_id ? {
              id: data.salesforce_account_id,
              name: data.client_name || data.template?.client_name || '',
            } : null,
            // Use the template data from the API response
            template: data.template || {
              // Header Information
              sow_title: data.sow_title || 'Statement of Work for LeanData Implementation',
              company_logo: data.company_logo || '',
              
              // Customer Information
              client_name: data.client_name || '',
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
              products: data.template?.products || [],
              number_of_units: data.template?.number_of_units || '',
              regions: data.template?.regions || '',
              salesforce_tenants: data.template?.salesforce_tenants || '',
              timeline_weeks: data.template?.timeline_weeks || '',
              start_date: data.template?.start_date || null,
              end_date: data.template?.end_date || null,
              units_consumption: data.template?.units_consumption || '',
              
              // BookIt Family Units
              orchestration_units: data.template?.number_of_units || data.orchestration_units || '',
              bookit_forms_units: data.bookit_forms_units || '',
              bookit_links_units: data.bookit_links_units || '',
              bookit_handoff_units: data.bookit_handoff_units || '',
              
              // Billing Information - map from billing_info JSONB field
              billing_company_name: data.billing_info?.companyName || data.template?.billing_company_name || '',
              billing_contact_name: data.billing_info?.billing_contact || data.template?.billing_contact_name || '',
              billing_address: data.billing_info?.billingAddress || data.template?.billing_address || '',
              billing_email: data.billing_info?.billing_email || data.template?.billing_email || '',
              purchase_order_number: data.billing_info?.poNumber || data.template?.purchase_order_number || '',
              
              // Salesforce Opportunity Information
              opportunity_id: data.template?.opportunity_id || data.opportunity_id || '',
              opportunity_name: data.template?.opportunity_name || data.opportunity_name || '',
              opportunity_amount: data.template?.opportunity_amount || data.opportunity_amount || undefined,
              opportunity_stage: data.template?.opportunity_stage || data.opportunity_stage || '',
              opportunity_close_date: data.template?.opportunity_close_date || data.opportunity_close_date || undefined,
            },
            objectives: {
              description: data.objectives?.description || '',
              key_objectives: data.objectives?.key_objectives || [''],
              avoma_url: data.objectives?.avoma_url || '',
              avoma_transcription: data.objectives?.avoma_transcription || '',
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
  
              deliverables: data.deliverables || '',
              timeline: {
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
              // Pricing configuration fields
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

            deliverables: data.deliverables || '',
            client_signer_name: data.client_signer_name || '',
            
            // Custom content fields
            custom_intro_content: data.custom_intro_content || null,
            custom_scope_content: data.custom_scope_content || null,
            custom_out_of_scope_content: data.custom_out_of_scope_content || null,
            custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || null,
            custom_key_objectives_content: data.custom_key_objectives_content || null,
            custom_deliverables_content: data.custom_deliverables_content || null,

            custom_project_phases_content: data.custom_project_phases_content || null,
            custom_roles_content: data.custom_roles_content || null,
            intro_content_edited: data.intro_content_edited || false,
            scope_content_edited: data.scope_content_edited || false,
            out_of_scope_content_edited: data.out_of_scope_content_edited || false,
            objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
            key_objectives_content_edited: data.key_objectives_content_edited || false,
            deliverables_content_edited: data.deliverables_content_edited || false,

            project_phases_content_edited: data.project_phases_content_edited || false,
            roles_content_edited: data.roles_content_edited || false,
          };
          
          // Set billing contact information from the correct database fields
          if (transformedData.template) {
            // Map billing info from the database structure to template fields
            transformedData.template.billing_company_name = data.billing_info?.company_name || 
                                                          data.template?.billing_company_name || '';
            transformedData.template.billing_address = data.billing_info?.billing_address || 
                                                     data.template?.billing_address || '';
            transformedData.template.billing_contact_name = data.billing_info?.billing_contact || 
                                                          data.template?.billing_contact_name || '';
            transformedData.template.billing_email = data.billing_info?.billing_email || 
                                                   data.template?.billing_email || '';
            transformedData.template.purchase_order_number = data.billing_info?.po_number || 
                                                          data.template?.purchase_order_number || '';
          }
          
          setSOW(transformedData);
        } else {
          console.error('Failed to fetch SOW');
        }
      } catch (error) {
        console.error('Error fetching SOW:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
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
     <SOWForm initialData={sow} />
  );
} 