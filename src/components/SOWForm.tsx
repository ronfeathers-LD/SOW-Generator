'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SOWData, SOWTemplate } from '@/types/sow';
import { SalesforceAccount, SalesforceContact } from '@/lib/salesforce';
import ProjectOverviewTab from './sow/ProjectOverviewTab';
import CustomerInformationTab from './sow/CustomerInformationTab';
import ObjectivesTab from './sow/ObjectivesTab';
import TeamRolesTab from './sow/TeamRolesTab';
import BillingInformationTab from './sow/BillingInformationTab';
import BillingPaymentTab from './sow/BillingPaymentTab';
import ContentEditingTab from './sow/ContentEditingTab';

import { createSalesforceAccountData, createSalesforceOpportunityData } from '@/types/salesforce';

interface LeanDataSignatory {
  id: string;
  name: string;
  email: string;
  title: string;
  is_active: boolean;
}

declare global {
  interface Window {
    google: unknown;
  }
}

interface PricingData {
  roles: Array<{ role: string; ratePerHour: number; defaultRate: number; totalHours: number }>;
  discount_type: string;
  discount_amount: number;
  discount_percentage: number;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  auto_calculated: boolean;
  last_calculated: string;
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
            sow_title: initialData.template?.sow_title || `Statement of Work for LeanData Implementation - ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            company_logo: initialData.template?.company_logo || '',
            client_name: initialData.template?.client_name || '',
            customer_signature_name: initialData.template?.customer_signature_name || '',
            customer_signature: initialData.template?.customer_signature || '',
            customer_email: initialData.template?.customer_email || '',
            customer_signature_date: initialData.template?.customer_signature_date || null,
            lean_data_name: initialData.template?.lean_data_name || '',
            lean_data_title: initialData.template?.lean_data_title || '',
            lean_data_email: initialData.template?.lean_data_email || '',
            lean_data_signature_name: initialData.template?.lean_data_signature_name || '',
            lean_data_signature: initialData.template?.lean_data_signature || '',
            lean_data_signature_date: initialData.template?.lean_data_signature_date || null,
            products: initialData.template?.products || [],
            number_of_units: initialData.template?.number_of_units || '',
            regions: initialData.template?.regions || '',
            salesforce_tenants: initialData.template?.salesforce_tenants || '',
            timeline_weeks: initialData.template?.timeline_weeks || '8',
            units_consumption: initialData.template?.units_consumption || 'All units immediately',
            
            // BookIt Family Units
            orchestration_units: initialData.template?.number_of_units || '',
            bookit_forms_units: initialData.template?.bookit_forms_units || '',
            bookit_links_units: initialData.template?.bookit_links_units || '',
            bookit_handoff_units: initialData.template?.bookit_handoff_units || '',
            other_products_units: initialData.template?.other_products_units || '',
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
            description: initialData.objectives?.description || '',
            key_objectives: initialData.objectives?.key_objectives || [''],
            avoma_transcription: initialData.objectives?.avoma_transcription || '',
          },
          scope: {
            ...initialData.scope,

            deliverables: initialData.deliverables || '',
          },
          pricing: {
            ...initialData.pricing,
            roles: initialData.pricing?.roles || [{
              role: '',
              ratePerHour: 0,
              totalHours: 0,
            }],
            billing: initialData.pricing?.billing || {
              company_name: '',
              billing_contact: '',
              billing_address: '',
              billing_email: '',
              po_number: '',
            },
            // New pricing configuration fields
            project_management_included: initialData.pricing?.project_management_included || false,
            project_management_hours: initialData.pricing?.project_management_hours || 40,
            project_management_rate: initialData.pricing?.project_management_rate || 225,
            base_hourly_rate: initialData.pricing?.base_hourly_rate || 200,
            discount_type: initialData.pricing?.discount_type || 'none',
            discount_amount: initialData.pricing?.discount_amount || 0,
            discount_percentage: initialData.pricing?.discount_percentage || 0,
            subtotal: initialData.pricing?.subtotal || 0,
            discount_total: initialData.pricing?.discount_total || 0,
            total_amount: initialData.pricing?.total_amount || 0,
          },
          custom_deliverables_content: initialData.custom_deliverables_content || '',
          deliverables_content_edited: initialData.deliverables_content_edited || false,
          custom_objective_overview_content: initialData.custom_objective_overview_content || '',
          objective_overview_content_edited: initialData.objective_overview_content_edited || false,
        }
      : {
          // Template Variables
          template: {
            // Header Information
            sow_title: `Statement of Work for LeanData Implementation - ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            company_logo: '',
            
            // Customer Information
            client_name: '',
            customer_signature_name: '',
            customer_signature: '',
            customer_email: '',
            customer_signature_date: null,
            
            // LeanData Information
            lean_data_name: '',
            lean_data_title: '',
            lean_data_email: '',
            lean_data_signature_name: '',
            lean_data_signature: '',
            lean_data_signature_date: null,
            
            // Project Details
            products: [],
            number_of_units: '',
            regions: '',
            salesforce_tenants: '',
            timeline_weeks: '8',
            units_consumption: 'All units immediately',
            
            // BookIt Family Units
            orchestration_units: '',
            bookit_forms_units: '',
            bookit_links_units: '',
            bookit_handoff_units: '',
            other_products_units: '',
            
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

            deliverables: '',
            timeline: {
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
              ratePerHour: 0,
              totalHours: 0,
            }],
            billing: {
              company_name: '',
              billing_contact: '',
              billing_address: '',
              billing_email: '',
              po_number: '',
            },
            // New pricing configuration fields
            project_management_included: false,
            project_management_hours: 40,
            project_management_rate: 225,
            base_hourly_rate: 200,
            discount_type: 'none',
            discount_amount: 0,
            discount_percentage: 0,
            subtotal: 0,
            discount_total: 0,
            total_amount: 0,
          },

          custom_deliverables_content: '',
          deliverables_content_edited: false,
          custom_objective_overview_content: '',
          objective_overview_content_edited: false,
        }
  );


  const [activeTab, setActiveTab] = useState('Project Overview');

  const handleTabChange = (tabKey: string) => {
    // Check for unsaved changes when switching from Content Editing tab
    if (activeTab === 'Content Editing' && hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes in the Content Editing tab. Are you sure you want to switch tabs? Your changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    
    setActiveTab(tabKey);
    // Update URL hash
    const hash = tabKey.toLowerCase().replace(/\s+/g, '-');
    window.location.hash = hash;
  };
  const [leanDataSignatories, setLeanDataSignatories] = useState<LeanDataSignatory[]>([]);
  const [selectedLeanDataSignatory, setSelectedLeanDataSignatory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<SalesforceAccount | null>(null);
  const [selectedContact, setSelectedContact] = useState<SalesforceContact | null>(null);

  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null>(null);
  const [availableOpportunities, setAvailableOpportunities] = useState<Array<{
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  }>>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Ref to get current pricing data from BillingPaymentTab
  const pricingRef = useRef<{ getCurrentPricingData?: () => PricingData }>(null);
  const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState<string>('https://na1.salesforce.com');

  // Wrapper function to update form data
  const updateFormData = (newData: Partial<SOWData>) => {
    setFormData(newData);
  };

  // Fetch LeanData signatories and Salesforce instance URL on component mount
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

    const fetchSalesforceInstanceUrl = async () => {
      try {
        const response = await fetch('/api/salesforce/instance-url');
        if (response.ok) {
          const data = await response.json();
          setSalesforceInstanceUrl(data.instanceUrl);
        } else {
          console.error('Failed to fetch Salesforce instance URL:', response.status, response.statusText);
          // Keep default URL
        }
      } catch (error) {
        console.error('Error fetching Salesforce instance URL:', error);
        // Keep default URL
      }
    };

    fetchLeanDataSignatories();
    fetchSalesforceInstanceUrl();
  }, []);

  const loadStoredSalesforceData = async (sowId: string) => {
    try {
      const response = await fetch(`/api/sow/${sowId}/salesforce-data`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.account_data) {
          const accountData = data.data.account_data;
          // Debug logging removed
          
          // Update selectedAccount with stored data including account_segment
          setSelectedAccount({
            Id: accountData.id,
            Name: accountData.name,
            BillingStreet: accountData.billing_address?.street || '',
            BillingCity: accountData.billing_address?.city || '',
            BillingState: accountData.billing_address?.state || '',
            BillingPostalCode: accountData.billing_address?.postal_code || '',
            BillingCountry: accountData.billing_address?.country || '',
            Billing_Contact__c: '',
            Billing_Email__c: '',
            Employee_Band__c: accountData.account_segment || ''
          });
          
          // Debug logging removed
        }
      }
    } catch (error) {
      console.error('Error loading stored Salesforce data:', error);
    }
  };

  // Load existing data when editing
  useEffect(() => {
    if (initialData) {
      // Set selected account if available from initialData or if customer name exists
      if (initialData.selectedAccount) {
        setSelectedAccount(initialData.selectedAccount);
      } else if (initialData.template?.client_name || initialData.header?.client_name) {
        const accountId = initialData.salesforce_account_id || '';
        setSelectedAccount({
          Id: accountId, // Use the Salesforce account ID if available
          Name: initialData.template?.client_name || initialData.header?.client_name || ''
        });
      }
      
      // Load stored Salesforce data if we have a SOW ID
      if (initialData.id) {
        loadStoredSalesforceData(initialData.id);
      }
      
      // Set selected contact if contact information exists
      
      // Check if we have any contact information (either from template or legacy fields)
      const hasContactInfo = initialData.template?.customer_signature_name || 
                           initialData.client_signer_name || 
                           initialData.template?.customer_email ||
                           initialData.client_signature?.email;
      
      if (hasContactInfo) {
        const fullName = initialData.template?.customer_signature_name || initialData.client_signer_name || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
        const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : fullName;
        
        const contactData = {
          Id: initialData.salesforce_contact_id || '', // Use the stored Salesforce contact ID
          FirstName: firstName,
          LastName: lastName,
          Email: initialData.template?.customer_email || initialData.client_signature?.email || '',
          Title: initialData.template?.customer_signature || initialData.client_signature?.title || '',
          AccountId: initialData.salesforce_account_id || '',
          Account: { Name: initialData.template?.client_name || initialData.header?.client_name || '' }
        };
        
        setSelectedContact(contactData);
        
        // Also ensure the form data is properly set
        setFormData(prevData => ({
          ...prevData,
          template: {
            ...prevData.template!,
            customer_signature_name: fullName,
            customer_email: contactData.Email,
            customer_signature: contactData.Title,
          },
          salesforce_contact_id: contactData.Id,
        }));
      }
      
      // Set selected opportunity if opportunity data exists
      if (initialData.template?.opportunity_id || initialData.template?.opportunity_name || initialData.opportunity_id || initialData.opportunity_name) {
        setSelectedOpportunity({
          id: initialData.template?.opportunity_id || initialData.opportunity_id || '',
          name: initialData.template?.opportunity_name || initialData.opportunity_name || '',
          amount: initialData.template?.opportunity_amount || initialData.opportunity_amount || undefined,
          stageName: initialData.template?.opportunity_stage || initialData.opportunity_stage || '',
          closeDate: initialData.template?.opportunity_close_date || initialData.opportunity_close_date || undefined,
          description: ''
        });
      }


      
      // Set form data for second signer if it exists
      if (initialData.template?.customer_signature_name_2) {
        setFormData(prevData => ({
          ...prevData,
          template: {
            ...prevData.template!,
            customer_signature_name_2: initialData.template?.customer_signature_name_2 || '',
            customer_signature_2: initialData.template?.customer_signature_2 || '',
            customer_email_2: initialData.template?.customer_email_2 || '',

          }
        }));
      }
    }
  }, [initialData]);
  
  // Navigation blocking for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    const handleTabChange = (e: KeyboardEvent) => {
      if (hasUnsavedChanges && (e.key === 'Tab' || e.key === 'Escape')) {
        e.preventDefault();
        alert('Please save your changes before navigating away from the Pricing tab.');
      }
    };
    
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('keydown', handleTabChange);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('keydown', handleTabChange);
      };
    }
  }, [hasUnsavedChanges]);

    // Initialize selected LeanData signatory when signatories are loaded and we have initial data
  useEffect(() => {
    if (leanDataSignatories && leanDataSignatories.length > 0) {
      if (initialData) {
        // First try to use the stored leandata_signatory_id if available
        if (initialData.leandata_signatory_id) {
          setSelectedLeanDataSignatory(initialData.leandata_signatory_id);
        } else {
          // Fallback to matching by name or email for backward compatibility
          const matchingSignatory = leanDataSignatories.find(signatory =>
            signatory.name === initialData.template?.lean_data_name ||
            signatory.email === initialData.template?.lean_data_email
          );

          if (matchingSignatory) {
            setSelectedLeanDataSignatory(matchingSignatory.id);
          }
        }
      } else {
        // For new SOWs, automatically select the first active signatory
        const firstActiveSignatory = leanDataSignatories.find(signatory => signatory.is_active);
        if (firstActiveSignatory) {
          setSelectedLeanDataSignatory(firstActiveSignatory.id);
          // Update form data with the selected signatory
          setFormData(prevData => ({
            ...prevData,
            template: {
              ...prevData.template!,
              lean_data_name: firstActiveSignatory.name,
              lean_data_title: firstActiveSignatory.title,
              lean_data_email: firstActiveSignatory.email,
              lean_data_signature_name: firstActiveSignatory.name,
              lean_data_signature: firstActiveSignatory.title
            }
          }));
        }
      }
    }
  }, [leanDataSignatories, initialData]);

    const handleLeanDataSignatoryChange = async (signatoryId: string): Promise<void> => {
    setSelectedLeanDataSignatory(signatoryId);

    if (signatoryId && leanDataSignatories) {
      const selectedSignatory = leanDataSignatories.find(s => s.id === signatoryId);
      if (selectedSignatory) {
        // Update local form data
        const updatedFormData = {
          ...formData,
          template: {
            ...formData.template!,
            lean_data_name: selectedSignatory.name,
            lean_data_title: selectedSignatory.title,
            lean_data_email: selectedSignatory.email,
            lean_data_signature_name: selectedSignatory.name,
            lean_data_signature: selectedSignatory.title
          }
        };
        setFormData(updatedFormData);

        // Save to database immediately
    if (formData.id) {
          try {
            const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tab: 'Signers & Roles',
                data: {
                  leandata_signatory_id: signatoryId,
                  template: {
                    lean_data_name: selectedSignatory.name,
                    lean_data_title: selectedSignatory.title,
                    lean_data_email: selectedSignatory.email,
                    lean_data_signature_name: selectedSignatory.name,
                    lean_data_signature: selectedSignatory.title
                  }
                }
              })
            });

            if (!response.ok) {
              console.error('Failed to save LeanData signatory:', response.statusText);
          }
        } catch (error) {
            console.error('Error saving LeanData signatory:', error);
          }
        }
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    account: unknown;
    opportunities: unknown[];
  }) => {
    const { account, opportunities } = customerData;
    const accountObj = account as { 
      Id: string; 
      Name: string; 
      Employee_Band__c?: string;
      BillingStreet?: string;
      BillingCity?: string;
      BillingState?: string;
      BillingPostalCode?: string;
      BillingCountry?: string;
      Billing_Contact__c?: string;
      Billing_Email__c?: string;
    };
    
    // Set the selected account for opportunity lookup with full data from customer-info response
    setSelectedAccount({
      Id: accountObj.Id,
      Name: accountObj.Name,
      BillingStreet: accountObj.BillingStreet || '',
      BillingCity: accountObj.BillingCity || '',
      BillingState: accountObj.BillingState || '',
      BillingPostalCode: accountObj.BillingPostalCode || '',
      BillingCountry: accountObj.BillingCountry || '',
      Billing_Contact__c: accountObj.Billing_Contact__c || '',
      Billing_Email__c: accountObj.Billing_Email__c || '',
      Employee_Band__c: accountObj.Employee_Band__c || ''
    });
    
    console.log('✅ SOWForm: Updated selectedAccount with Account Segment:', accountObj.Employee_Band__c);
    
    // Store available opportunities - convert from uppercase API response to lowercase for component use
    setAvailableOpportunities((opportunities as Array<{
      Id: string;
      Name: string;
      Amount?: number;
      StageName?: string;
      CloseDate?: string;
      Description?: string;
    }>).map(opp => ({
      id: opp.Id,
      name: opp.Name,
      amount: opp.Amount,
      stageName: opp.StageName,
      closeDate: opp.CloseDate,
      description: opp.Description
    })) || []);
    
    // Reset selected opportunity when account changes
    setSelectedOpportunity(null);
    
    // Auto-populate customer information with account details
    setFormData({
      ...formData,
      template: {
        ...formData.template,
        customer_name: accountObj.Name,
        // Don't auto-populate contact details until POC is selected
        customer_email: '',
        customer_signature_name: '',
        customer_signature: '',
      } as SOWTemplate,
      header: {
        ...formData.header,
        client_name: accountObj.Name,
      } as { company_logo: string; client_name: string; sow_title: string },
    });

    // Save Salesforce data to database if we have a SOW ID
    if (initialData?.id) {
      try {
        const accountData = createSalesforceAccountData(accountObj);
        
        await fetch(`/api/sow/${initialData.id}/salesforce-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            account_data: accountData,
            opportunity_data: opportunities.length > 0 ? createSalesforceOpportunityData({
              Id: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).Id,
              Name: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).Name,
              Amount: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).Amount,
              StageName: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).StageName || '',
              CloseDate: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).CloseDate || '',
              Description: (opportunities[0] as { Id: string; Name: string; Amount?: number; StageName?: string; CloseDate?: string; Description?: string }).Description || ''
            }) : undefined
          }),
        });
      } catch (error) {
        console.error('Error saving Salesforce data:', error);
      }
    }
  };





  // Helper function to generate Salesforce record links
  const getSalesforceLink = (recordId: string) => {
    return `${salesforceInstanceUrl}/${recordId}`;
  };

  const handleOpportunitySelectedFromSalesforce = async (opportunity: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null) => {
    setSelectedOpportunity(opportunity);
    
    if (opportunity) {
      // Store opportunity information in form data
      setFormData({
        ...formData,
        template: {
          ...formData.template,
          // Auto-populate SOW title with opportunity name if it's not already set
          sow_title: (!formData.template?.sow_title || formData.template.sow_title.trim() === '') 
            ? `Statement of Work for ${opportunity.name}` 
            : formData.template.sow_title,
          // Store opportunity details
          opportunity_id: opportunity.id,
          opportunity_name: opportunity.name,
          opportunity_amount: opportunity.amount,
          opportunity_stage: opportunity.stageName,
          opportunity_close_date: opportunity.closeDate,
        } as SOWTemplate,
      });

      // Save opportunity data to database if we have a SOW ID
      if (initialData?.id) {
        try {
          const opportunityData = createSalesforceOpportunityData({
            Id: opportunity.id,
            Name: opportunity.name,
            Amount: opportunity.amount,
            StageName: opportunity.stageName || '',
            CloseDate: opportunity.closeDate || '',
            Description: opportunity.description || ''
          });
          
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
          ...formData.template,
          opportunity_id: '',
          opportunity_name: '',
          opportunity_amount: undefined,
          opportunity_stage: '',
          opportunity_close_date: undefined,
        } as SOWTemplate,
      });
    }
  };



  const handleTabSave = async () => {
    
    if (!initialData?.id) {
      setNotification({
        type: 'error',
        message: 'No SOW ID found. Please create a new SOW first.'
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }



          try {
        setIsSaving(true);
        const url = `/api/sow/${initialData.id}/tab-update`;
        
        
        // Prepare tab-specific data
        let tabData: Record<string, unknown> = {};
      
      
      switch (activeTab) {
        case 'Project Overview':
          tabData = {
            template: {
              sow_title: formData.template?.sow_title,
              products: formData.template?.products || [],
              regions: formData.template?.regions,
              salesforce_tenants: formData.template?.salesforce_tenants,
              timeline_weeks: formData.template?.timeline_weeks,
              units_consumption: formData.template?.units_consumption,
              // BookIt Family Units
              number_of_units: formData.template?.number_of_units,
              bookit_forms_units: formData.template?.bookit_forms_units,
              bookit_links_units: formData.template?.bookit_links_units,
              bookit_handoff_units: formData.template?.bookit_handoff_units,
              other_products_units: formData.template?.other_products_units,
            }
          };
          break;

        case 'Customer Information':
          tabData = {
            template: {
              client_name: formData.template?.client_name,
              customer_signature_name: formData.template?.customer_signature_name,
              customer_email: formData.template?.customer_email,
              lean_data_name: formData.template?.lean_data_name,
              lean_data_title: formData.template?.lean_data_title,
              lean_data_email: formData.template?.lean_data_email,
              opportunity_id: formData.template?.opportunity_id,
              opportunity_name: formData.template?.opportunity_name,
              opportunity_amount: formData.template?.opportunity_amount,
              opportunity_stage: formData.template?.opportunity_stage,
              opportunity_close_date: formData.template?.opportunity_close_date,
            },
            header: {
              company_logo: formData.header?.company_logo,
            },
            client_signature: {
              name: formData.template?.customer_signature_name,
              title: formData.template?.customer_signature,
              email: formData.template?.customer_email,
              signature_date: formData.template?.customer_signature_date,
            }
          };
          break;

        case 'Objectives':
          tabData = {
            objectives: {
              description: formData.objectives?.description,
              key_objectives: formData.objectives?.key_objectives,
              avoma_transcription: formData.objectives?.avoma_transcription,
              avoma_url: formData.objectives?.avoma_url,
              avoma_recordings: formData.objectives?.avoma_recordings,
            },
            scope: {
              deliverables: formData.scope?.deliverables,
            },
            custom_deliverables_content: formData.custom_deliverables_content,
            deliverables_content_edited: formData.deliverables_content_edited,
            custom_objective_overview_content: formData.custom_objective_overview_content,
            objective_overview_content_edited: formData.objective_overview_content_edited,
            custom_key_objectives_content: formData.custom_key_objectives_content,
            key_objectives_content_edited: formData.key_objectives_content_edited,
          };
          break;

        case 'Signers & Roles':
          tabData = {
            roles: {
              client_roles: formData.roles?.client_roles,
            },
            // Save signer information
            template: {
              customer_signature_name: formData.template?.customer_signature_name,
              customer_email: formData.template?.customer_email,
              customer_signature: formData.template?.customer_signature,
              // Second signer information
              customer_signature_name_2: formData.template?.customer_signature_name_2,
              customer_signature_2: formData.template?.customer_signature_2,
              customer_email_2: formData.template?.customer_email_2,
              // LeanData signatory information
              lean_data_name: formData.template?.lean_data_name,
              lean_data_title: formData.template?.lean_data_title,
              lean_data_email: formData.template?.lean_data_email,
            },
            // Save Salesforce contact ID
            salesforce_contact_id: selectedContact?.Id || null,
            // Save LeanData signatory ID
            leandata_signatory_id: selectedLeanDataSignatory || null,
          };
          break;

        case 'Billing Information':
          tabData = {
            template: {
              billing_contact_name: formData.template?.billing_contact_name,
              billing_email: formData.template?.billing_email,
              billing_company_name: formData.template?.billing_company_name,
              billing_address: formData.template?.billing_address,
              purchase_order_number: formData.template?.purchase_order_number,
            },
            // Save billing information
            pricing: {
              billing: formData.pricing?.billing
            }
          };
          break;

        case 'Pricing':
          // For Pricing tab, we need to get the current data from the component state
          // Use the ref to get the most up-to-date pricing data
          const currentPricingData = pricingRef.current?.getCurrentPricingData?.();
          tabData = {
            pricing: {
              roles: currentPricingData?.roles || formData.pricing?.roles || [],
              discount_type: currentPricingData?.discount_type || formData.pricing?.discount_type || 'none',
              discount_amount: currentPricingData?.discount_amount || formData.pricing?.discount_amount || 0,
              discount_percentage: currentPricingData?.discount_percentage || formData.pricing?.discount_percentage || 0,
              subtotal: currentPricingData?.subtotal || formData.pricing?.subtotal || 0,
              discount_total: currentPricingData?.discount_total || formData.pricing?.discount_total || 0,
              total_amount: currentPricingData?.total_amount || formData.pricing?.total_amount || 0,
              // Auto-save tracking fields
              auto_calculated: formData.pricing?.auto_calculated || false,
              last_calculated: formData.pricing?.last_calculated || new Date().toISOString(),
            }
          };
          
          
          // Reset unsaved changes for Pricing tab
          setHasUnsavedChanges(false);
          break;

        case 'Content Editing':
          tabData = {
            custom_intro_content: formData.custom_intro_content,
            custom_scope_content: formData.custom_scope_content,
            custom_objectives_disclosure_content: formData.custom_objectives_disclosure_content,
            custom_assumptions_content: formData.custom_assumptions_content,
            custom_project_phases_content: formData.custom_project_phases_content,
            custom_roles_content: formData.custom_roles_content,
            custom_deliverables_content: formData.custom_deliverables_content,
            custom_objective_overview_content: formData.custom_objective_overview_content,
            intro_content_edited: formData.intro_content_edited,
            scope_content_edited: formData.scope_content_edited,
            objectives_disclosure_content_edited: formData.objectives_disclosure_content_edited,
            assumptions_content_edited: formData.assumptions_content_edited,
            project_phases_content_edited: formData.project_phases_content_edited,
            roles_content_edited: formData.roles_content_edited,
            deliverables_content_edited: formData.deliverables_content_edited,
            objective_overview_content_edited: formData.objective_overview_content_edited,
            custom_key_objectives_content: formData.custom_key_objectives_content,
            key_objectives_content_edited: formData.key_objectives_content_edited,
          };
          

          break;

        default:
          setNotification({
            type: 'error',
            message: 'Unknown tab. Please try again.'
          });
          setTimeout(() => setNotification(null), 5000);
          return;
      }


      
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: activeTab,
          data: tabData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tab data');
      }
      
      const result = await response.json();
      
      // Show success notification
      setNotification({
        type: 'success',
        message: result.message || `${activeTab} saved successfully!`
      });
      
      // Don't reload the page - just show success message
      
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error(`Error saving ${activeTab}:`, error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Failed to save ${activeTab}. Please try again.`
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = useMemo(() => [
    { key: 'Project Overview', label: 'Project Overview' },
    { key: 'Customer Information', label: 'Customer Information' },
    { key: 'Objectives', label: 'Objectives' },
    { key: 'Signers & Roles', label: 'Signers & Roles' },
    { key: 'Billing Information', label: 'Billing Information' },
    { key: 'Pricing', label: 'Pricing' },
    { key: 'Content Editing', label: 'Content Editing' },
  ], []);



  // Tab navigation with URL hash persistence
  useEffect(() => {
    // Get tab from URL hash on component mount
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const tabKey = tabs.find(tab => tab.key.toLowerCase().replace(/\s+/g, '-') === hash);
      if (tabKey) {
        setActiveTab(tabKey.key);
      }
    } else {
      // Set default hash for first tab if no hash is present
      const defaultHash = tabs[0].key.toLowerCase().replace(/\s+/g, '-');
      window.location.hash = defaultHash;
    }

    // Listen for hash changes (browser back/forward buttons)
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash) {
        const tabKey = tabs.find(tab => tab.key.toLowerCase().replace(/\s+/g, '-') === newHash);
        if (tabKey) {
          setActiveTab(tabKey.key);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs]);

  // Update page title based on SOW data
  useEffect(() => {
    const updatePageTitle = () => {
      const isEdit = !!initialData;
      const sowTitle = formData.template?.sow_title || 'SOW';
      const action = isEdit ? 'Edit' : 'View';
      document.title = `${action} - ${sowTitle}`;
    };

    updatePageTitle();
  }, [initialData, formData.template?.sow_title]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {initialData ? `Edit ${formData.template?.sow_title || 'SOW'}` : 'Create New SOW'}
                </h1>
                {initialData && (
                  <div className="mt-1">
                    {selectedAccount?.Employee_Band__c ? (
                 <span className="text-lg font-normal text-gray-600">
                   (Using &quot;{selectedAccount.Employee_Band__c}&quot; project guidelines)
                 </span>
                    ) : selectedAccount ? (
                      <span className="text-lg font-normal text-yellow-600">
                        (account segment: {selectedAccount.Employee_Band__c || 'undefined'})
                      </span>
                    ) : (
                      <span className="text-lg font-normal text-red-600">
                        (no account selected)
                      </span>
                    )}
                  </div>
                )}
              </div>
        {initialData && (
          <div className="flex items-center space-x-3">
            <a
              href={`/sow/${initialData.id}`}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </a>
            <button
              onClick={async () => {
                if (!initialData) return;
                
                // Enhanced confirmation dialog
                const confirmMessage = `Are you sure you want to delete "${initialData.template?.sow_title || 'this SOW'}"?\n\n` +
                  `This action will permanently hide this SOW and all its versions from the system.\n` +
                  `The data will be preserved but will no longer be visible.\n\n` +
                  `Type "DELETE" to confirm:`;
                
                const userInput = prompt(confirmMessage);
                if (userInput !== 'DELETE') {
                  return;
                }

                try {
                  const response = await fetch(`/api/sow/${initialData.id}`, {
                    method: 'DELETE',
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete SOW');
                  }

                  const result = await response.json();
                  
                  // Show success message
                  alert(`SOW "${initialData.template?.sow_title || 'SOW'}" deleted successfully${result.hiddenVersions ? ` along with ${result.hiddenVersions} version(s)` : ''}.`);

                  // Redirect to the SOW list page
                  window.location.href = '/sow';
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to delete SOW';
                  alert(`Error: ${errorMessage}`);
                }
              }}
              className="inline-flex items-center px-3 py-1 border border-red-600 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Delete SOW from the system"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
              </button>
        </div>
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

      <div className="space-y-8 pb-20">
      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <a
              key={tab.key}
              href={`#${tab.key.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={(e) => {
                e.preventDefault();
                handleTabChange(tab.key);
              }}
              className={
                (activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
                ' whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none cursor-pointer'
              }
            >
              {tab.label}
            </a>
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
          selectedOpportunity={selectedOpportunity}
          availableOpportunities={availableOpportunities}
          onCustomerSelectedFromSalesforce={handleCustomerSelectedFromSalesforce}
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

      {/* Signers & Roles Section */}
      {activeTab === 'Signers & Roles' && (
        <TeamRolesTab
          formData={formData}
          setFormData={updateFormData}
            leanDataSignatories={leanDataSignatories}
          selectedLeanDataSignatory={selectedLeanDataSignatory}
          onLeanDataSignatoryChange={handleLeanDataSignatoryChange}
          selectedAccount={selectedAccount}
            selectedContact={selectedContact}
          getSalesforceLink={getSalesforceLink}
          isActiveTab={activeTab === 'Signers & Roles'}
          onContactChange={(contact) => setSelectedContact(contact)}
        />
      )}

      {/* Billing Information Section */}
      {activeTab === 'Billing Information' && (
        <BillingInformationTab
          formData={formData}
          setFormData={updateFormData}
          selectedAccount={selectedAccount}
        />
      )}

      {/* Pricing Section */}
        {activeTab === 'Pricing' && (
          <>
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-yellow-800">
                    <p className="font-medium">Unsaved Changes</p>
                    <p className="text-sm">You have unsaved pricing changes. Please save your changes before navigating away from this tab.</p>
      </div>
                </div>
              </div>
            )}
            
            <BillingPaymentTab
              formData={formData}
              setFormData={updateFormData}
              selectedAccount={selectedAccount}
              ref={pricingRef}
            />
          </>
        )}

      {/* Content Editing Section */}
      {activeTab === 'Content Editing' && (
        <ContentEditingTab
          formData={formData}
          setFormData={updateFormData}
          onUnsavedChanges={setHasUnsavedChanges}
        />
      )}

      {/* Floating Save Button - Always visible for all tabs */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={handleTabSave}
          disabled={isSaving}
          className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Save {activeTab}
            </>
          )}
        </button>
      </div>
    </div>
    </div>
  );
}