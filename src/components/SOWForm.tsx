'use client';

import { useState, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GeminiBulletPoint } from '@/lib/gemini';
import { SalesforceOpportunity, SalesforceContact } from '@/lib/salesforce';
import AvomaIntegration from './AvomaIntegration';
import WYSIWYGEditor from './WYSIWYGEditor';
import SalesforceIntegration from './SalesforceIntegration';
import OpportunityLookup from './OpportunityLookup';
import ProjectOverviewTab from './sow/ProjectOverviewTab';
import CustomerInformationTab from './sow/CustomerInformationTab';
import ObjectivesTab from './sow/ObjectivesTab';
import TeamRolesTab from './sow/TeamRolesTab';
import BillingPaymentTab from './sow/BillingPaymentTab';
import AddendumsTab from './sow/AddendumsTab';
import ContentEditingTab from './sow/ContentEditingTab';
import { createSalesforceAccountData, createSalesforceContactData, createSalesforceOpportunityData } from '@/types/salesforce';

interface LeanDataSignatory {
  id: string;
  name: string;
  email: string;
  title: string;
}

declare global {
  interface Window {
    google: any;
  }
}

interface SOWFormProps {
  initialData?: SOWData;
}

export default function SOWForm({ initialData }: SOWFormProps) {
  const [formData, setFormData] = useState<Partial<SOWData>>(
    initialData
      ? {
          ...initialData,
          template: {
            sow_title: initialData.template?.sow_title || 'Statement of Work for LeanData Implementation',
            company_logo: initialData.template?.company_logo || '',
            customer_name: initialData.template?.customer_name || '',
            customer_signature_name: initialData.template?.customer_signature_name || '',
            customer_signature: initialData.template?.customer_signature || '',
            customer_email: initialData.template?.customer_email || '',
            customer_signature_date: initialData.template?.customer_signature_date || null,
            lean_data_name: initialData.template?.lean_data_name || 'Agam Vasani',
            lean_data_title: initialData.template?.lean_data_title || 'VP Customer Success',
            lean_data_email: initialData.template?.lean_data_email || 'agam.vasani@leandata.com',
            lean_data_signature_name: initialData.template?.lean_data_signature_name || 'Agam Vasani',
            lean_data_signature: initialData.template?.lean_data_signature || '',
            lean_data_signature_date: initialData.template?.lean_data_signature_date || null,
            products: initialData.template?.products || [],
            number_of_units: initialData.template?.number_of_units || '125',
            regions: initialData.template?.regions || '1',
            salesforce_tenants: initialData.template?.salesforce_tenants || '2',
            timeline_weeks: initialData.template?.timeline_weeks || '8',
            start_date: initialData.template?.start_date || (initialData.project_start_date ? new Date(initialData.project_start_date) : null),
            end_date: initialData.template?.end_date || (initialData.project_end_date ? new Date(initialData.project_end_date) : null),
            units_consumption: initialData.template?.units_consumption || 'All units immediately',
            billing_company_name: initialData.template?.billing_company_name || '',
            billing_contact_name: initialData.template?.billing_contact_name || '',
            billing_address: initialData.template?.billing_address || '',
            billing_email: initialData.template?.billing_email || '',
            purchase_order_number: initialData.template?.purchase_order_number || '',
            opportunity_id: initialData.template?.opportunity_id || '',
            opportunity_name: initialData.template?.opportunity_name || '',
            opportunity_amount: initialData.template?.opportunity_amount || undefined,
            opportunity_stage: initialData.template?.opportunity_stage || '',
            opportunity_close_date: initialData.template?.opportunity_close_date || '',
          },
          objectives: {
            ...initialData.objectives,
            description: initialData.objectives?.description || initialData.scope?.project_description || '',
            key_objectives: initialData.objectives?.key_objectives || [''],
            avoma_transcription: initialData.objectives?.avoma_transcription || '',
          },
          scope: {
            ...initialData.scope,
            project_description: initialData.scope?.project_description || '',
            deliverables: initialData.deliverables || '',
          },
        }
      : {
          // Template Variables
          template: {
            // Header Information
            sow_title: 'Statement of Work for LeanData Implementation',
            company_logo: '',
            
            // Customer Information
            customer_name: '',
            customer_signature_name: '',
            customer_signature: '',
            customer_email: '',
            customer_signature_date: null,
            
            // LeanData Information
            lean_data_name: 'Agam Vasani',
            lean_data_title: 'VP Customer Success',
            lean_data_email: 'agam.vasani@leandata.com',
            lean_data_signature_name: 'Agam Vasani',
            lean_data_signature: '',
            lean_data_signature_date: null,
            
            // Project Details
            products: [],
            number_of_units: '125',
            regions: '1',
            salesforce_tenants: '2',
            timeline_weeks: '8',
            start_date: null,
            end_date: null,
            units_consumption: 'All units immediately',
            
            // Billing Information
            billing_company_name: '',
            billing_contact_name: '',
            billing_address: '',
            billing_email: '',
            purchase_order_number: '',
            
            // Salesforce Opportunity Information
            opportunity_id: '',
            opportunity_name: '',
            opportunity_amount: undefined,
            opportunity_stage: '',
            opportunity_close_date: '',
          },
          
          // Legacy fields (keeping for backward compatibility)
          header: {
            company_logo: '',
            client_name: '',
            sow_title: '',
          },
          client_signature: {
            name: '',
            title: '',
            email: '',
            signature_date: new Date(),
          },
          objectives: {
            description: '',
            key_objectives: [''],
          },
          scope: {
            project_description: '',
            deliverables: '',
            timeline: {
              start_date: new Date(),
              duration: '',
            },
          },
          roles: {
            client_roles: [{
              role: '',
              name: '',
              email: '',
              responsibilities: '',
            }],
          },
          pricing: {
            roles: [{
              role: '',
              rate_per_hour: 0,
              total_hours: 0,
            }],
            billing: {
              company_name: '',
              billing_contact: '',
              billing_address: '',
              billing_email: '',
              po_number: '',
              payment_terms: '',
              currency: '',
            },
          },
          assumptions: {
            access_requirements: '',
            travel_requirements: '',
            working_hours: '',
            testing_responsibilities: '',
          },
          addendums: [{
            title: '',
            content: '',
            risks: [''],
            mitigations: [''],
            support_scope: {
              supported: [''],
              not_supported: [''],
            },
          }],
        }
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.header?.company_logo || null);
  const [activeTab, setActiveTab] = useState('Project Overview');
  const router = useRouter();
  const [leanDataSignatories, setLeanDataSignatories] = useState<LeanDataSignatory[]>([]);
  const [selectedLeanDataSignatory, setSelectedLeanDataSignatory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<SalesforceContact | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesforceOpportunity | null>(null);
  const [availableOpportunities, setAvailableOpportunities] = useState<SalesforceOpportunity[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Wrapper function to track changes
  const updateFormData = (newData: Partial<SOWData>) => {
    setFormData(newData);
    if (initialData) {
      setHasChanges(true);
    }
  };

  // Fetch LeanData signatories on component mount
  useEffect(() => {
    const fetchLeanDataSignatories = async () => {
      try {
        const response = await fetch('/api/leandata-signatories');
        if (response.ok) {
          const data = await response.json();
          setLeanDataSignatories(data || []);
        } else {
          console.error('Failed to fetch LeanData signatories:', response.status, response.statusText);
          setLeanDataSignatories([]);
        }
      } catch (error) {
        console.error('Error fetching LeanData signatories:', error);
        setLeanDataSignatories([]);
      }
    };

    fetchLeanDataSignatories();
  }, []);

  // Load existing data when editing
  useEffect(() => {
    if (initialData) {
      // Set selected account if customer name exists
      if (initialData.template?.customer_name || initialData.header?.client_name) {
        const accountId = initialData.salesforce_account_id || '';
        setSelectedAccount({
          id: accountId, // Use the Salesforce account ID if available
          name: initialData.template?.customer_name || initialData.header?.client_name || ''
        });
      }
      
      // Set selected contact if contact information exists
      if (initialData.template?.customer_signature_name || initialData.client_signer_name) {
        setSelectedContact({
          Id: '', // We don't have the Salesforce ID when loading from database
          FirstName: '',
          LastName: initialData.template?.customer_signature_name || initialData.client_signer_name || '',
          Email: initialData.template?.customer_email || initialData.client_signature?.email || '',
          Title: initialData.template?.customer_signature || initialData.client_signature?.title || '',
          AccountId: '',
          Account: { Name: '' }
        });
      }
      
      // Set selected opportunity if opportunity data exists
      if (initialData.template?.opportunity_id || initialData.template?.opportunity_name || initialData.opportunity_id || initialData.opportunity_name) {
        setSelectedOpportunity({
          Id: initialData.template?.opportunity_id || initialData.opportunity_id || '',
          Name: initialData.template?.opportunity_name || initialData.opportunity_name || '',
          Amount: initialData.template?.opportunity_amount || initialData.opportunity_amount || undefined,
          StageName: initialData.template?.opportunity_stage || initialData.opportunity_stage || '',
          CloseDate: initialData.template?.opportunity_close_date || initialData.opportunity_close_date || undefined,
          Description: '',
          AccountId: '',
          Account: { Name: '' }
        });
      }
    }
  }, [initialData]);

    // Initialize selected LeanData signatory when signatories are loaded and we have initial data
  useEffect(() => {
    if (leanDataSignatories && leanDataSignatories.length > 0 && initialData) {
      // Find the signatory that matches the existing data
      const matchingSignatory = leanDataSignatories.find(signatory =>
        signatory.name === initialData.template?.lean_data_name ||
        signatory.email === initialData.template?.lean_data_email
      );

      if (matchingSignatory) {
        setSelectedLeanDataSignatory(matchingSignatory.id);
      }
    }
  }, [leanDataSignatories, initialData]);

    const handleLeanDataSignatoryChange = (signatoryId: string) => {
    setSelectedLeanDataSignatory(signatoryId);

    if (signatoryId && leanDataSignatories) {
      const selectedSignatory = leanDataSignatories.find(s => s.id === signatoryId);
      if (selectedSignatory) {
        setFormData({
          ...formData,
          template: {
            ...formData.template!,
            lean_data_name: selectedSignatory.name,
            lean_data_title: selectedSignatory.title,
            lean_data_email: selectedSignatory.email,
            lean_data_signature_name: selectedSignatory.name,
            lean_data_signature: selectedSignatory.title
          }
        });
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      // Convert the file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({
          ...formData,
          template: { ...formData.template!, company_logo: base64String },
          header: { ...formData.header!, company_logo: base64String }
        });
      };
      reader.readAsDataURL(file);
    }
  };





  const handleCustomerSelectedFromSalesforce = async (customerData: {
    account: any;
    contacts: any[];
    opportunities: any[];
  }) => {
    const { account, contacts, opportunities } = customerData;
    
    // Set the selected account for opportunity lookup
    setSelectedAccount({
      id: account.Id,
      name: account.Name
    });
    
    // Store available opportunities
    setAvailableOpportunities(opportunities || []);
    
    // Reset selected opportunity when account changes
    setSelectedOpportunity(null);
    
    // Auto-populate customer information with account details
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        customer_name: account.Name,
        // Don't auto-populate contact details until POC is selected
        customer_email: '',
        customer_signature_name: '',
        customer_signature: '',
      },
      header: {
        ...formData.header!,
        client_name: account.Name,
      },
    });

    // Save Salesforce data to database if we have a SOW ID
    if (initialData?.id) {
      try {
        const accountData = createSalesforceAccountData(account);
        
        await fetch(`/api/sow/${initialData.id}/salesforce-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_data: accountData,
            contacts_data: contacts.map(contact => createSalesforceContactData(contact)),
            opportunity_data: opportunities.length > 0 ? createSalesforceOpportunityData(opportunities[0]) : undefined
          }),
        });
      } catch (error) {
        console.error('Error saving Salesforce data:', error);
      }
    }
  };

  const handleContactSelectedFromSalesforce = async (contact: SalesforceContact | null) => {
    setSelectedContact(contact);
    
    if (contact) {
      // Auto-populate contact information when POC is selected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customer_email: contact.Email || '',
          customer_signature_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
          customer_signature: contact.Title || '',
        },
      });

      // Save contact data to database if we have a SOW ID
      if (initialData?.id) {
        try {
          const contactData = createSalesforceContactData(contact, 'primary_poc');
          
          await fetch(`/api/sow/${initialData.id}/salesforce-data`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contacts_data: [contactData]
            }),
          });
        } catch (error) {
          console.error('Error saving contact data:', error);
        }
      }
    } else {
      // Clear contact information when POC is deselected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customer_email: '',
          customer_signature_name: '',
          customer_signature: '',
        },
      });
    }
  };

  // Helper function to generate Salesforce record links
  const getSalesforceLink = (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => {
    // For now, we'll use a generic Salesforce URL pattern
    // In a real implementation, you'd get the instance URL from the Salesforce connection
    const baseUrl = process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL || 'https://na1.salesforce.com';
    return `${baseUrl}/${recordId}`;
  };

  const handleOpportunitySelectedFromSalesforce = async (opportunity: SalesforceOpportunity | null) => {
    setSelectedOpportunity(opportunity);
    
    if (opportunity) {
      // Store opportunity information in form data
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          // Auto-populate SOW title with opportunity name if it's not already set
          sow_title: (!formData.template?.sow_title || formData.template.sow_title === 'Statement of Work for LeanData Implementation') 
            ? `Statement of Work for ${opportunity.Name}` 
            : formData.template.sow_title,
          // Store opportunity details
          opportunity_id: opportunity.Id,
          opportunity_name: opportunity.Name,
          opportunity_amount: opportunity.Amount,
          opportunity_stage: opportunity.StageName,
          opportunity_close_date: opportunity.CloseDate,
        },
      });

      // Save opportunity data to database if we have a SOW ID
      if (initialData?.id) {
        try {
          const opportunityData = createSalesforceOpportunityData(opportunity);
          
          await fetch(`/api/sow/${initialData.id}/salesforce-data`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              opportunity_data: opportunityData
            }),
          });
        } catch (error) {
          console.error('Error saving opportunity data:', error);
        }
      }
    } else {
      // Clear opportunity information when deselected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          opportunity_id: '',
          opportunity_name: '',
          opportunity_amount: undefined,
          opportunity_stage: '',
          opportunity_close_date: undefined,
        },
      });
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only validate customer signature name if we're on the Customer Information tab or if it's an update
    if (activeTab === 'Customer Information' && !formData.template?.customer_signature_name?.trim()) {
      alert('Please enter the customer signature name');
      return;
    }
    
    // For other tabs, allow saving without customer signature name (it can be filled later)
    if (!formData.template?.customer_signature_name?.trim()) {
      console.log('Saving SOW without customer signature name - can be filled later');
    }

    try {
      const url = `/api/sow/${initialData?.id}`;
      const method = 'PUT';
      
      // Map template fields to snake_case for API submission
      
      const submissionData = {
        ...formData,
        client_signer_name: formData.template?.customer_signature_name || '',
        client_signature: {
          name: formData.template?.customer_signature_name || '',
          title: formData.template?.customer_signature || '',
          email: formData.template?.customer_email || '',
          signature_date: formData.template?.customer_signature_date || null,
        },
        header: {
          company_logo: formData.header?.company_logo || '',
          sow_title: formData.header?.sow_title || '',
          client_name: formData.template?.customer_name || formData.header?.client_name || '',
        },
        // Ensure opportunity data is included in submission
        template: {
          ...formData.template,
          start_date: formData.template?.start_date || null,
          end_date: formData.template?.end_date || null,
          opportunity_id: formData.template?.opportunity_id || null,
          opportunity_name: formData.template?.opportunity_name || null,
          opportunity_amount: formData.template?.opportunity_amount || null,
          opportunity_stage: formData.template?.opportunity_stage || null,
          opportunity_close_date: formData.template?.opportunity_close_date || null,
        }
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save SOW');
      }
      
      const data = await response.json();
              // SOW save response received
      // Response includes avoma_url
      

      
      // Show success notification
      setNotification({
        type: 'success',
        message: activeTab === 'Customer Information' 
          ? 'Customer information saved successfully!' 
          : 'SOW updated successfully!'
      });
      
      // Reset changes flag after successful save
      setHasChanges(false);
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error saving SOW:', error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: activeTab === 'Customer Information' 
          ? 'Failed to save customer information. Please try again.' 
          : 'Failed to update SOW. Please try again.'
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const tabs = [
    { key: 'Project Overview', label: 'Project Overview' },
    { key: 'Customer Information', label: 'Customer Information' },
    { key: 'Objectives', label: 'Objectives' },
    { key: 'Team & Roles', label: 'Team & Roles' },
    { key: 'Billing & Payment', label: 'Billing & Payment' },
    { key: 'Content Editing', label: 'Content Editing' },
    { key: 'Addendums', label: 'Addendums' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {initialData ? 'Edit SOW' : 'Create New SOW'}
        </h1>
        {initialData && (
          <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
            Edit Mode
          </span>
        )}
      </div>
      
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm transform transition-all duration-300 ease-in-out ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : notification.type === 'warning'
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : notification.type === 'warning' ? (
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setNotification(null)}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  notification.type === 'success'
                    ? 'text-green-400 hover:text-green-500 focus:ring-green-500'
                    : notification.type === 'warning'
                    ? 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500'
                    : 'text-red-400 hover:text-red-500 focus:ring-red-500'
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                // Show warning if switching tabs without saving and there are changes
                if (initialData && activeTab !== tab.key && hasChanges) {
                  setNotification({
                    type: 'warning',
                    message: 'Remember to click "Update SOW" to save your changes before switching tabs!'
                  });
                  setTimeout(() => setNotification(null), 4000);
                }
                setActiveTab(tab.key);
              }}
              className={
                (activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
                ' whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Project Overview Section */}
      {activeTab === 'Project Overview' && (
        <ProjectOverviewTab
          formData={formData}
          setFormData={updateFormData}
        />
      )}

      {/* Customer Information Section */}
      {activeTab === 'Customer Information' && (
        <CustomerInformationTab
          formData={formData}
          setFormData={updateFormData}
          initialData={initialData}
          selectedAccount={selectedAccount}
          selectedContact={selectedContact}
          selectedOpportunity={selectedOpportunity}
          availableOpportunities={availableOpportunities}
          onCustomerSelectedFromSalesforce={handleCustomerSelectedFromSalesforce}
          onContactSelectedFromSalesforce={handleContactSelectedFromSalesforce}
          onOpportunitySelectedFromSalesforce={handleOpportunitySelectedFromSalesforce}
          onAvailableOpportunitiesUpdate={setAvailableOpportunities}
          getSalesforceLink={getSalesforceLink}
          onLogoChange={handleLogoChange}
        />
      )}

      {/* Objectives Section */}
      {activeTab === 'Objectives' && (
        <ObjectivesTab
          formData={formData}
          setFormData={updateFormData}
          selectedAccount={selectedAccount}
        />
      )}

      {/* Team & Roles Section */}
      {activeTab === 'Team & Roles' && (
        <TeamRolesTab
          formData={formData}
          setFormData={updateFormData}
                        leanDataSignatories={leanDataSignatories}
              selectedLeanDataSignatory={selectedLeanDataSignatory}
              onLeanDataSignatoryChange={handleLeanDataSignatoryChange}
        />
      )}

      {/* Billing & Payment Section */}
      {activeTab === 'Billing & Payment' && (
        <BillingPaymentTab
          formData={formData}
          setFormData={updateFormData}
          selectedAccountId={selectedAccount?.id}
        />
      )}

      {/* Content Editing Section */}
      {activeTab === 'Content Editing' && (
        <ContentEditingTab
          formData={formData}
          setFormData={updateFormData}
        />
      )}

      {/* Addendums Section */}
      {activeTab === 'Addendums' && (
        <AddendumsTab
          formData={formData}
          setFormData={updateFormData}
        />
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {activeTab === 'Customer Information' 
            ? 'Save Customer Information' 
            : 'Update SOW'
          }
        </button>
      </div>
    </form>
    </div>
  );
} 