'use client';

import { useState, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GeminiBulletPoint } from '@/lib/gemini';
import { SalesforceOpportunity, SalesforceContact } from '@/lib/salesforce';
import AvomaIntegration from './AvomaIntegration';
import RichTextEditor from './RichTextEditor';
import SalesforceIntegration from './SalesforceIntegration';
import OpportunityLookup from './OpportunityLookup';
import ProjectOverviewTab from './sow/ProjectOverviewTab';
import CustomerInformationTab from './sow/CustomerInformationTab';
import ObjectivesTab from './sow/ObjectivesTab';
import ScopeDeliverablesTab from './sow/ScopeDeliverablesTab';
import TeamRolesTab from './sow/TeamRolesTab';
import BillingPaymentTab from './sow/BillingPaymentTab';
import AddendumsTab from './sow/AddendumsTab';

interface LeanDataSignator {
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
          objectives: {
            ...initialData.objectives,
            description: initialData.objectives?.description || initialData.scope?.projectDescription || '',
            keyObjectives: initialData.objectives?.keyObjectives || [''],
            avomaTranscription: initialData.objectives?.avomaTranscription || '',
          },
          scope: {
            ...initialData.scope,
            projectDescription: initialData.scope?.projectDescription || '',
            deliverables: initialData.deliverables || '',
          },
        }
      : {
          // Template Variables
          template: {
            // Header Information
            sowTitle: 'Statement of Work for LeanData Implementation',
            companyLogo: '',
            
            // Customer Information
            customerName: '',
            customerSignatureName: '',
            customerSignature: '',
            customerEmail: '',
            customerSignatureDate: null,
            
            // LeanData Information
            leanDataName: 'Agam Vasani',
            leanDataTitle: 'VP Customer Success',
            leanDataEmail: 'agam.vasani@leandata.com',
            leanDataSignatureName: 'Agam Vasani',
            leanDataSignature: '',
            leanDataSignatureDate: null,
            
            // Project Details
            products: 'Matching/Routing',
            numberOfUnits: '125',
            regions: '1',
            salesforceTenants: '2',
            timelineWeeks: '8',
            
            // Billing Information
            billingCompanyName: '',
            billingContactName: '',
            billingAddress: '',
            billingEmail: '',
            purchaseOrderNumber: '',
            
            // Salesforce Opportunity Information
            opportunityId: '',
            opportunityName: '',
            opportunityAmount: undefined,
            opportunityStage: '',
            opportunityCloseDate: '',
          },
          
          // Legacy fields (keeping for backward compatibility)
          header: {
            companyLogo: '',
            clientName: '',
            sowTitle: '',
          },
          clientSignature: {
            name: '',
            title: '',
            email: '',
            signatureDate: new Date(),
          },
          objectives: {
            description: '',
            keyObjectives: [''],
          },
          scope: {
            projectDescription: '',
            deliverables: '',
            timeline: {
              startDate: new Date(),
              duration: '',
            },
          },
          roles: {
            clientRoles: [{
              role: '',
              name: '',
              email: '',
              responsibilities: '',
            }],
          },
          pricing: {
            roles: [{
              role: '',
              ratePerHour: 0,
              totalHours: 0,
            }],
            billing: {
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
            accessRequirements: '',
            travelRequirements: '',
            workingHours: '',
            testingResponsibilities: '',
          },
          addendums: [{
            title: '',
            content: '',
            risks: [''],
            mitigations: [''],
            supportScope: {
              supported: [''],
              notSupported: [''],
            },
          }],
        }
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.header?.companyLogo || null);
  const [activeTab, setActiveTab] = useState('Project Overview');
  const router = useRouter();
  const [leanDataSignators, setLeanDataSignators] = useState<LeanDataSignator[]>([]);
  const [selectedLeanDataSignator, setSelectedLeanDataSignator] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<SalesforceContact | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesforceOpportunity | null>(null);
  const [availableOpportunities, setAvailableOpportunities] = useState<SalesforceOpportunity[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch LeanData signators on component mount
  useEffect(() => {
    const fetchLeanDataSignators = async () => {
      try {
        const response = await fetch('/api/leandata-signators');
        if (response.ok) {
          const data = await response.json();
          setLeanDataSignators(data);
        }
      } catch (error) {
        console.error('Error fetching LeanData signators:', error);
      }
    };

    fetchLeanDataSignators();
  }, []);

  // Load existing data when editing
  useEffect(() => {
    if (initialData) {
      // Set selected account if customer name exists
      if (initialData.template?.customerName || initialData.header?.clientName) {
        setSelectedAccount({
          id: '', // We don't have the Salesforce ID when loading from database
          name: initialData.template?.customerName || initialData.header?.clientName || ''
        });
      }
      
      // Set selected contact if contact information exists
      if (initialData.template?.customerSignatureName || initialData.clientSignerName) {
        setSelectedContact({
          Id: '', // We don't have the Salesforce ID when loading from database
          FirstName: '',
          LastName: initialData.template?.customerSignatureName || initialData.clientSignerName || '',
          Email: initialData.template?.customerEmail || initialData.clientSignature?.email || '',
          Title: initialData.template?.customerSignature || initialData.clientSignature?.title || '',
          AccountId: '',
          Account: { Name: '' }
        });
      }
      
      // Set selected opportunity if opportunity data exists
      if (initialData.template?.opportunityId || initialData.template?.opportunityName || initialData.opportunityId || initialData.opportunityName) {
        setSelectedOpportunity({
          Id: initialData.template?.opportunityId || initialData.opportunityId || '',
          Name: initialData.template?.opportunityName || initialData.opportunityName || '',
          Amount: initialData.template?.opportunityAmount || initialData.opportunityAmount || undefined,
          StageName: initialData.template?.opportunityStage || initialData.opportunityStage || '',
          CloseDate: initialData.template?.opportunityCloseDate || initialData.opportunityCloseDate || undefined,
          Description: '',
          AccountId: '',
          Account: { Name: '' }
        });
      }
    }
  }, [initialData]);

  // Initialize selected LeanData signator when signators are loaded and we have initial data
  useEffect(() => {
    if (leanDataSignators.length > 0 && initialData) {
      // Find the signator that matches the existing data
      const matchingSignator = leanDataSignators.find(signator => 
        signator.name === initialData.template?.leanDataName ||
        signator.email === initialData.template?.leanDataEmail
      );
      
      if (matchingSignator) {
        setSelectedLeanDataSignator(matchingSignator.id);
      }
    }
  }, [leanDataSignators, initialData]);

  const handleLeanDataSignatorChange = (signatorId: string) => {
    setSelectedLeanDataSignator(signatorId);
    
    if (signatorId) {
      const selectedSignator = leanDataSignators.find(s => s.id === signatorId);
      if (selectedSignator) {
        setFormData({
          ...formData,
          template: {
            ...formData.template!,
            leanDataName: selectedSignator.name,
            leanDataTitle: selectedSignator.title,
            leanDataEmail: selectedSignator.email,
            leanDataSignatureName: selectedSignator.name,
            leanDataSignature: selectedSignator.title
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
          template: { ...formData.template!, companyLogo: base64String },
          header: { ...formData.header!, companyLogo: base64String }
        });
      };
      reader.readAsDataURL(file);
    }
  };





  const handleCustomerSelectedFromSalesforce = (customerData: {
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
        customerName: account.Name,
        // Don't auto-populate contact details until POC is selected
        customerEmail: '',
        customerSignatureName: '',
        customerSignature: '',
      },
    });
  };

  const handleContactSelectedFromSalesforce = (contact: SalesforceContact | null) => {
    setSelectedContact(contact);
    
    if (contact) {
      // Auto-populate contact information when POC is selected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customerEmail: contact.Email || '',
          customerSignatureName: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
          customerSignature: contact.Title || '',
        },
      });
    } else {
      // Clear contact information when POC is deselected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customerEmail: '',
          customerSignatureName: '',
          customerSignature: '',
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

  const handleOpportunitySelectedFromSalesforce = (opportunity: SalesforceOpportunity | null) => {
    setSelectedOpportunity(opportunity);
    
    if (opportunity) {
      // Store opportunity information in form data
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          // Auto-populate SOW title with opportunity name if it's not already set
          sowTitle: (!formData.template?.sowTitle || formData.template.sowTitle === 'Statement of Work for LeanData Implementation') 
            ? `Statement of Work for ${opportunity.Name}` 
            : formData.template.sowTitle,
          // Store opportunity details
          opportunityId: opportunity.Id,
          opportunityName: opportunity.Name,
          opportunityAmount: opportunity.Amount,
          opportunityStage: opportunity.StageName,
          opportunityCloseDate: opportunity.CloseDate,
        },
      });
    } else {
      // Clear opportunity information when deselected
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          opportunityId: '',
          opportunityName: '',
          opportunityAmount: undefined,
          opportunityStage: '',
          opportunityCloseDate: undefined,
        },
      });
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only validate customer signature name if we're on the Customer Information tab or if it's an update
    if (activeTab === 'Customer Information' && !formData.template?.customerSignatureName?.trim()) {
      alert('Please enter the customer signature name');
      return;
    }
    
    // For other tabs, allow saving without customer signature name (it can be filled later)
    if (!formData.template?.customerSignatureName?.trim()) {
      console.log('Saving SOW without customer signature name - can be filled later');
    }

    try {
      const url = initialData ? `/api/sow/${initialData.id}` : '/api/sow';
      const method = initialData ? 'PUT' : 'POST';
      
      // Map template fields to legacy fields for backward compatibility
      const submissionData = {
        ...formData,
        clientSignerName: formData.template?.customerSignatureName || '',
        clientSignature: {
          name: formData.template?.customerSignatureName || '',
          title: formData.template?.customerSignature || '',
          email: formData.template?.customerEmail || '',
          signatureDate: formData.template?.customerSignatureDate || null,
        },
        header: {
          companyLogo: formData.header?.companyLogo || '',
          sowTitle: formData.header?.sowTitle || '',
          clientName: formData.template?.customerName || formData.header?.clientName || '',
        },
        // Ensure opportunity data is included in submission
        template: {
          ...formData.template,
          opportunityId: formData.template?.opportunityId || null,
          opportunityName: formData.template?.opportunityName || null,
          opportunityAmount: formData.template?.opportunityAmount || null,
          opportunityStage: formData.template?.opportunityStage || null,
          opportunityCloseDate: formData.template?.opportunityCloseDate || null,
        }
      };

      // Debug logging
      console.log('Saving SOW with data:', {
        customerName: formData.template?.customerName,
        customerSignatureName: formData.template?.customerSignatureName,
        customerEmail: formData.template?.customerEmail,
        objectives: {
          description: formData.objectives?.description,
          keyObjectives: formData.objectives?.keyObjectives,
          avomaTranscription: formData.objectives?.avomaTranscription,
        },
        leanDataSignator: {
          leanDataName: formData.template?.leanDataName,
          leanDataTitle: formData.template?.leanDataTitle,
          leanDataEmail: formData.template?.leanDataEmail,
          selectedLeanDataSignator: selectedLeanDataSignator
        },
        opportunityData: {
          opportunityId: formData.template?.opportunityId,
          opportunityName: formData.template?.opportunityName,
          opportunityAmount: formData.template?.opportunityAmount,
          opportunityStage: formData.template?.opportunityStage,
          opportunityCloseDate: formData.template?.opportunityCloseDate,
        },
        submissionData: {
          clientName: submissionData.header.clientName,
          clientSignerName: submissionData.clientSignerName,
          clientSignature: submissionData.clientSignature,
          template: submissionData.template,
          objectives: submissionData.objectives
        }
      });
      
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
      console.log('SOW save response:', data);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: activeTab === 'Customer Information' 
          ? 'Customer information saved successfully!' 
          : (initialData ? 'SOW updated successfully!' : 'SOW created successfully!')
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error saving SOW:', error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: activeTab === 'Customer Information' 
          ? 'Failed to save customer information. Please try again.' 
          : 'Failed to save SOW. Please try again.'
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const tabs = [
    { key: 'Project Overview', label: 'Project Overview' },
    { key: 'Customer Information', label: 'Customer Information' },
    { key: 'Objectives', label: 'Objectives' },
    { key: 'Scope & Deliverables', label: 'Scope & Deliverables' },
    { key: 'Team & Roles', label: 'Team & Roles' },
    { key: 'Billing & Payment', label: 'Billing & Payment' },
    { key: 'Addendums', label: 'Addendums' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm transform transition-all duration-300 ease-in-out ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
              onClick={() => setActiveTab(tab.key)}
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
          setFormData={setFormData}
          leanDataSignators={leanDataSignators}
          selectedLeanDataSignator={selectedLeanDataSignator}
          onLeanDataSignatorChange={handleLeanDataSignatorChange}
        />
      )}

      {/* Customer Information Section */}
      {activeTab === 'Customer Information' && (
        <CustomerInformationTab
          formData={formData}
          setFormData={setFormData}
          initialData={initialData}
          selectedAccount={selectedAccount}
          selectedContact={selectedContact}
          selectedOpportunity={selectedOpportunity}
          availableOpportunities={availableOpportunities}
          onCustomerSelectedFromSalesforce={handleCustomerSelectedFromSalesforce}
          onContactSelectedFromSalesforce={handleContactSelectedFromSalesforce}
          onOpportunitySelectedFromSalesforce={handleOpportunitySelectedFromSalesforce}
          getSalesforceLink={getSalesforceLink}
          onLogoChange={handleLogoChange}
        />
      )}

      {/* Objectives Section */}
      {activeTab === 'Objectives' && (
        <ObjectivesTab
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {/* Scope & Deliverables Section */}
      {activeTab === 'Scope & Deliverables' && (
        <ScopeDeliverablesTab
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {/* Team & Roles Section */}
      {activeTab === 'Team & Roles' && (
        <TeamRolesTab
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {/* Billing & Payment Section */}
      {activeTab === 'Billing & Payment' && (
        <BillingPaymentTab
          formData={formData}
          setFormData={setFormData}
          selectedAccountId={selectedAccount?.id}
        />
      )}

      {/* Addendums Section */}
      {activeTab === 'Addendums' && (
        <AddendumsTab
          formData={formData}
          setFormData={setFormData}
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
            : (initialData ? 'Update SOW' : 'Save SOW')
          }
        </button>
      </div>
    </form>
    </div>
  );
} 