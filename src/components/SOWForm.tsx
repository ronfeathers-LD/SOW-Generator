'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SOWData, SOWTemplate } from '@/types/sow';
import { SalesforceAccount, SalesforceContact } from '@/lib/salesforce';
import ProjectOverviewTab from './sow/ProjectOverviewTab';
import CustomerInformationTab from './sow/CustomerInformationTab';
import ObjectivesWizard from './sow/ObjectivesWizard';
import type { ObjectivesStepNav } from './sow/ObjectivesWizard';
import TeamRolesTab from './sow/TeamRolesTab';
import BillingInformationTab from './sow/BillingInformationTab';
import BillingPaymentTab from './sow/BillingPaymentTab';
import ContentEditingTab from './sow/ContentEditingTab';

import { createSalesforceAccountData, createSalesforceOpportunityData } from '@/types/salesforce';
import { SOW_TAB_KEYS, SowTabKey } from '@/lib/sow/tab-payloads';
import type { RestrictedTab } from '@/lib/sow/edit-access';
import { saveAllTabs } from '@/lib/sow/save-all';
import { getSectionStatus } from '@/lib/sow/section-status';
import { reviewSOW } from '@/lib/sow/review';
import ReviewSubmitTab from './sow/ReviewSubmitTab';
import { Button } from '@/components/ui/form';
import type { StepStatus } from '@/components/ui/form';
import ConfirmActionModal from './ConfirmActionModal';

const REVIEW_STEP_KEY = 'Review & Submit';

/**
 * The rebuilt creation flow groups the editable sections into four phases that
 * match how a SOW is actually built: who & what → what we'll deliver → what it
 * costs → who signs. Each phase hosts one or more of the existing sections.
 */
const PHASES: { key: string; title: string; sections: string[] }[] = [
  { key: 'account', title: 'Account & Project', sections: ['Customer Information', 'Project Overview'] },
  { key: 'scope', title: 'Scope & Content', sections: ['Objectives', 'Content Editing'] },
  { key: 'commercials', title: 'Commercials', sections: ['Billing Information', 'Pricing'] },
  { key: 'signoff', title: 'Sign-off', sections: ['Signers & Roles', REVIEW_STEP_KEY] },
];

/** Short labels for the per-phase sub-navigation pills. */
const SECTION_LABELS: Record<string, string> = {
  'Customer Information': 'Customer',
  'Project Overview': 'Project',
  Objectives: 'Objectives',
  'Content Editing': 'Content',
  'Billing Information': 'Billing',
  Pricing: 'Pricing & Roles',
  'Signers & Roles': 'Signers',
  [REVIEW_STEP_KEY]: 'Review & Submit',
};

type PhaseRollup = 'complete' | 'attention' | 'partial' | 'empty';

interface LeanDataSignatory {
  id: string;
  name: string;
  email: string;
  title: string;
  is_active: boolean;
  is_default?: boolean;
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
  /** When set, the form is locked to a single tab (post-approval edit modes). */
  restrictedTab?: RestrictedTab;
  /** Current SOW status — gates Submit-for-Review in the Sign-off phase to drafts. */
  status?: string;
}

export default function SOWForm({ initialData, restrictedTab, status }: SOWFormProps) {
  // Two mutually exclusive single-tab modes. `pricingOnly` is kept as a derived
  // local so the many existing pricing checks below read unchanged.
  const pricingOnly = restrictedTab === 'Pricing';
  const [formData, setFormData] = useState<Partial<SOWData>>(
    initialData
      ? {
          ...initialData,
          template: {
            sow_title: initialData.template?.sow_title || (initialData.template?.opportunity_name && initialData.template?.client_name
              ? `${initialData.template.opportunity_name} - ${initialData.template.client_name}`
              : ''),
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
            orchestration_units: initialData.template?.orchestration_units || initialData.template?.number_of_units || '',
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
            sow_title: '',
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


  const [activeTab, setActiveTab] = useState(restrictedTab ?? 'Customer Information');

  const handleTabChange = (tabKey: string) => {
    // Auto-save on navigation instead of nagging with a confirm dialog. Switching
    // sections keeps the in-memory formData either way, so navigation is never
    // blocked; we just kick off a save-all in the background so the work is also
    // persisted to the DB. (handleSaveAll snapshots live pricing synchronously
    // before the active section unmounts, and reports its own status/errors via
    // the footer indicator.) The beforeunload guard still covers a hard reload.
    if (hasUnsavedChanges) {
      void handleSaveAll();
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
    // Partner fields
    isvPartnerAccount?: string;
    isvPartnerAccountName?: string;
    partnerAccount?: string;
    partnerAccountName?: string;
    implementationPartner?: string;
    channelPartnerContractAmount?: number;
    dateOfPartnerEngagement?: string;
    isPartnerSourced?: boolean;
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // The objectives AI sub-stepper publishes its current nav here so the single
  // footer button drives the sub-steps (then continues to the next section).
  const [objectivesNav, setObjectivesNav] = useState<ObjectivesStepNav | null>(null);
  
  // Ref to get current pricing data from BillingPaymentTab
  const pricingRef = useRef<{ getCurrentPricingData?: () => PricingData }>(null);
  const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState<string>('https://na1.salesforce.com');
  const [hasLoadedSalesforceData, setHasLoadedSalesforceData] = useState<boolean>(false);

  // Wrapper function to update form data. Any tab editing through this marks the
  // whole form dirty so the unsaved-changes guard covers every tab, not just the
  // active one (the gap behind the #109 data-loss bug).
  const updateFormData = (newData: Partial<SOWData>) => {
    setFormData(newData);
    setHasUnsavedChanges(true);
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
        
        // Also reconstruct selected opportunity with partner data if available
        if (data.success && data.data?.opportunity_data) {
          const opportunityData = data.data.opportunity_data;
          setSelectedOpportunity({
            id: opportunityData.id,
            name: opportunityData.name,
            amount: opportunityData.amount,
            stageName: opportunityData.stage_name,
            closeDate: opportunityData.close_date,
            description: opportunityData.description || '',
            // Partner fields
            isvPartnerAccount: opportunityData.isv_partner_account,
            isvPartnerAccountName: opportunityData.isv_partner_account_name,
            partnerAccount: opportunityData.partner_account,
            partnerAccountName: opportunityData.partner_account_name,
            implementationPartner: opportunityData.implementation_partner,
            channelPartnerContractAmount: opportunityData.channel_partner_contract_amount,
            dateOfPartnerEngagement: opportunityData.date_of_partner_engagement,
            isPartnerSourced: opportunityData.is_partner_sourced
          });
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
      } else if (initialData.template?.client_name) {
        const accountId = initialData.salesforce_account_id || '';
        const reconstructedAccount = {
          Id: accountId, // Use the Salesforce account ID if available
          Name: initialData.template?.client_name || '',
          // Include account segment from stored data
          Employee_Band__c: initialData.account_segment || '',
          // Include account owner information if available
          Owner: (initialData.salesforce_account_owner_name || initialData.salesforce_account_owner_email) ? {
            Name: initialData.salesforce_account_owner_name || '',
            Email: initialData.salesforce_account_owner_email || ''
          } : undefined
        };
        setSelectedAccount(reconstructedAccount);
      }
      
      // Load stored Salesforce data if we have a SOW ID and haven't loaded it yet
      if (initialData.id && !hasLoadedSalesforceData) {
        setHasLoadedSalesforceData(true);
        loadStoredSalesforceData(initialData.id);
      }
      
      // Set selected contact if contact information exists
      
      // Check if we have any contact information
      const hasContactInfo = initialData.template?.customer_signature_name ||
                           initialData.client_signer_name ||
                           initialData.template?.customer_email;
      
      if (hasContactInfo) {
        const fullName = initialData.template?.customer_signature_name || initialData.client_signer_name || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
        const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : fullName;
        
        const contactData = {
          Id: initialData.salesforce_contact_id || '', // Use the stored Salesforce contact ID
          FirstName: firstName,
          LastName: lastName,
          Email: initialData.template?.customer_email || '',
          Title: initialData.template?.customer_signature || '',
          AccountId: initialData.salesforce_account_id || '',
          Account: { Name: initialData.template?.client_name || '' }
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
      
      // Set selected opportunity if opportunity data exists (fallback if not loaded from Salesforce data)
      if ((initialData.template?.opportunity_id || initialData.template?.opportunity_name || initialData.opportunity_id || initialData.opportunity_name) && !selectedOpportunity) {
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
  }, [initialData, hasLoadedSalesforceData, selectedOpportunity]); // Added hasLoadedSalesforceData to prevent multiple loads
  
  // Warn on full-page unload (reload / close / external navigation) when there
  // are unsaved edits. The in-app tab switch is guarded separately in
  // handleTabChange; we intentionally no longer hijack Tab/Escape keystrokes,
  // which broke keyboard navigation and accessibility.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return 'You have unsaved changes. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
        // For new SOWs, automatically select the default signatory (or first active if no default)
        const defaultSignatory = leanDataSignatories.find(signatory => signatory.is_default)
          || leanDataSignatories.find(signatory => signatory.is_active);
        if (defaultSignatory) {
          setSelectedLeanDataSignatory(defaultSignatory.id);
          // Update form data with the selected signatory
          setFormData(prevData => ({
            ...prevData,
            template: {
              ...prevData.template!,
              lean_data_name: defaultSignatory.name,
              lean_data_title: defaultSignatory.title,
              lean_data_email: defaultSignatory.email,
              lean_data_signature_name: defaultSignatory.name,
              lean_data_signature: defaultSignatory.title
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
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = () => {
    setFormData({
      ...formData,
      template: { ...formData.template!, company_logo: '' },
    });
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
      Owner?: {
        Name: string;
        Email: string;
      };
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
      Employee_Band__c: accountObj.Employee_Band__c || '',
      Owner: accountObj.Owner
    });
    
    // Store available opportunities - convert from uppercase API response to lowercase for component use
    setAvailableOpportunities((opportunities as Array<{
      Id: string;
      Name: string;
      Amount?: number;
      StageName?: string;
      CloseDate?: string;
      Description?: string;
      // Partner fields
      isvPartnerAccount?: string;
      isvPartnerAccountName?: string;
      partnerAccount?: string;
      partnerAccountName?: string;
      implementationPartner?: string;
      channelPartnerContractAmount?: number;
      dateOfPartnerEngagement?: string;
      isPartnerSourced?: boolean;
    }>).map(opp => ({
      id: opp.Id,
      name: opp.Name,
      amount: opp.Amount,
      stageName: opp.StageName,
      closeDate: opp.CloseDate,
      description: opp.Description,
      // Partner fields
      isvPartnerAccount: opp.isvPartnerAccount,
      isvPartnerAccountName: opp.isvPartnerAccountName,
      partnerAccount: opp.partnerAccount,
      partnerAccountName: opp.partnerAccountName,
      implementationPartner: opp.implementationPartner,
      channelPartnerContractAmount: opp.channelPartnerContractAmount,
      dateOfPartnerEngagement: opp.dateOfPartnerEngagement,
      isPartnerSourced: opp.isPartnerSourced
    })) || []);
    
    // Reset selected opportunity when account changes
    setSelectedOpportunity(null);
    
    // Auto-populate customer information with account details
    setFormData({
      ...formData,
      template: {
        ...formData.template,
        client_name: accountObj.Name,
        // Don't auto-populate contact details until POC is selected
        customer_email: '',
        customer_signature_name: '',
        customer_signature: '',
      } as SOWTemplate,
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

        // Update the SOW table with Salesforce account information
        await fetch(`/api/sow/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            salesforce_account_id: accountObj.Id,
            salesforce_account_owner_name: accountObj.Owner?.Name || '',
            salesforce_account_owner_email: accountObj.Owner?.Email || ''
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
    // Partner fields
    isvPartnerAccount?: string;
    isvPartnerAccountName?: string;
    partnerAccount?: string;
    partnerAccountName?: string;
    implementationPartner?: string;
    channelPartnerContractAmount?: number;
    dateOfPartnerEngagement?: string;
    isPartnerSourced?: boolean;
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
            Description: opportunity.description || '',
            // Partner fields
            ISV_Partner_Account__c: opportunity.isvPartnerAccount,
            ISV_Partner_Account__r: opportunity.isvPartnerAccountName ? { Name: opportunity.isvPartnerAccountName } : undefined,
            Partner_Account__c: opportunity.partnerAccount,
            Partner_Account__r: opportunity.partnerAccountName ? { Name: opportunity.partnerAccountName } : undefined,
            Implementation_Partner__c: opportunity.implementationPartner,
            Channel_Partner_Contract_Amount__c: opportunity.channelPartnerContractAmount,
            Date_of_Partner_Engagement__c: opportunity.dateOfPartnerEngagement
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



  // Save every visible section in one action, not just the active tab. This is
  // the fix for #109: edits made on a tab that wasn't active at save time used
  // to be silently dropped on reload. Each section is persisted through the same
  // per-tab endpoint (reusing all its server-side validation), and a failure on
  // any one section is surfaced rather than swallowed.
  const handleSaveAll = async () => {
    if (!initialData?.id) {
      setNotification({
        type: 'error',
        message: 'No SOW ID found. Please create a new SOW first.'
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Pricing edits live in the Pricing component's own state and only reach
    // formData via the ref. Persist Pricing only when that component is mounted
    // and can hand us its current values; otherwise we'd overwrite live pricing
    // with a stale snapshot. (All other tabs write straight to formData, so they
    // are always safe to save from anywhere.)
    const livePricing = pricingRef.current?.getCurrentPricingData?.() ?? null;

    // In pricing-only mode the other sections are read-only (and would be
    // rejected on an in-review SOW), so persist Pricing alone.
    let tabKeys: SowTabKey[] = restrictedTab ? [restrictedTab] : [...SOW_TAB_KEYS];
    if (!livePricing) {
      tabKeys = tabKeys.filter(tab => tab !== 'Pricing');
    }

    if (tabKeys.length === 0) {
      setNotification({ type: 'warning', message: 'Open the Pricing section to save pricing changes.' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    try {
      setIsSaving(true);
      const result = await saveAllTabs(initialData.id, tabKeys, formData, {
        pricingData: livePricing,
        selectedContactId: selectedContact?.Id ?? null,
        selectedLeanDataSignatoryId: selectedLeanDataSignatory || null,
        nowIso: new Date().toISOString(),
      });

      if (result.ok) {
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setNotification({
          type: 'success',
          message: 'All changes saved successfully!'
        });
      } else {
        const failedTabs = result.failed.map(f => f.tab).join(', ');
        setNotification({
          type: 'error',
          message: `Some sections could not be saved: ${failedTabs}. Please try again.`
        });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error saving SOW:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save. Please try again.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = useMemo(() => {
    const allTabs = [
      { key: 'Customer Information', label: 'Customer Information' },
      { key: 'Project Overview', label: 'Project Overview' },
      { key: 'Objectives', label: 'Objectives' },
      { key: 'Signers & Roles', label: 'Signers & POCs' },
      { key: 'Billing Information', label: 'Billing Information' },
      { key: 'Pricing', label: 'Pricing and LeanData Roles' },
      { key: 'Content Editing', label: 'Content Editing' },
    ];
    
    // Restricted modes show only their single tab.
    if (restrictedTab) {
      return allTabs.filter(tab => tab.key === restrictedTab);
    }

    return allTabs;
  }, [restrictedTab]);

  // Flat, ordered section list for Back/Next, in phase order with Review last.
  // Pricing-only mode stays a single-section edit (no phases).
  const wizardKeys = useMemo(
    () =>
      restrictedTab
        ? tabs.map((t) => t.key)
        : // Commercials renders Billing + Pricing stacked, so it's a single
          // Back/Next stop (its first section).
          PHASES.flatMap((p) => (p.key === 'commercials' ? [p.sections[0]] : p.sections)),
    [tabs, restrictedTab],
  );

  // Whether the SOW passes the strict submit-gating validation — drives the
  // Review phase status.
  const reviewValid = useMemo(() => reviewSOW(formData).result.isValid, [formData]);

  // At-a-glance completion status for a section (#24); Review uses strict validation.
  const sectionStatus = (key: string): StepStatus =>
    key === REVIEW_STEP_KEY
      ? reviewValid
        ? 'complete'
        : 'attention'
      : getSectionStatus(key as SowTabKey, formData);

  // A phase rolls up the statuses of its sections for the top progress bar.
  const phaseRollup = (sections: string[]): PhaseRollup => {
    const statuses = sections.map(sectionStatus);
    if (statuses.some((s) => s === 'attention')) return 'attention';
    if (statuses.every((s) => s === 'complete')) return 'complete';
    if (statuses.some((s) => s === 'complete')) return 'partial';
    return 'empty';
  };

  const activePhaseIndex = Math.max(0, PHASES.findIndex((p) => p.sections.includes(activeTab)));
  const activePhase = PHASES[activePhaseIndex] ?? PHASES[0];

  // Next/Back navigation through the wizard sections.
  const currentStepIndex = wizardKeys.findIndex((key) => key === activeTab);
  const goToStep = (index: number) => {
    if (index >= 0 && index < wizardKeys.length) {
      handleTabChange(wizardKeys[index]);
    }
  };



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

  const handleConfirmedDelete = async () => {
    if (!initialData) return;
    setShowDeleteModal(false);

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
  };

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
              onClick={() => {
                if (!initialData) return;
                setShowDeleteModal(true);
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

      {initialData && (
        <ConfirmActionModal
          isOpen={showDeleteModal}
          title="Delete this SOW?"
          message={`"${initialData.template?.sow_title || 'This SOW'}" and all its versions will be hidden from the system.\nThe data is preserved and an admin can restore it later.`}
          confirmLabel="Delete SOW"
          requiredText="DELETE"
          onConfirm={handleConfirmedDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

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
      {/* Restricted-mode notice */}
      {restrictedTab && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {pricingOnly ? (
                  <><strong>Pricing-Only Edit Mode:</strong> You are editing pricing and discounts on an approved SOW. Only pricing-related fields can be modified.</>
                ) : (
                  <><strong>Signers-Only Edit Mode:</strong> You are editing the signers on an approved SOW. Only signer fields can be modified; no re-approval is required.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4-phase wizard: top progress bar + per-phase sub-nav + the active section. */}
      {!restrictedTab && (
        <>
          <nav aria-label="Progress" className="mb-8">
            <ol className="flex list-none items-center pl-0">
              {PHASES.map((phase, i) => {
                const roll = phaseRollup(phase.sections);
                const isActive = i === activePhaseIndex;
                const done = roll === 'complete';
                // Top dots show PROGRESS only — current (green ring), complete
                // (green + check), or to-do (neutral outline). Per-section
                // attention is surfaced on the sub-nav pills + Review step, so
                // it's kept off the top bar to avoid a muddy multi-colour row.
                const badge = isActive
                  ? 'bg-[#26D07C] text-[#2a2a2a] ring-2 ring-[#26D07C] ring-offset-2 dark:ring-offset-dark-bg'
                  : done
                    ? 'bg-[#26D07C] text-[#2a2a2a]'
                    : 'border-2 border-gray-300 text-gray-400 dark:border-dark-border dark:text-dark-text-muted';
                return (
                  <React.Fragment key={phase.key}>
                    <li>
                      <button
                        type="button"
                        onClick={() => handleTabChange(phase.sections[0])}
                        className="group flex items-center gap-2.5"
                      >
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${badge}`}>
                          {done ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className={`hidden whitespace-nowrap text-sm font-medium lg:block ${isActive ? 'text-gray-900 dark:text-dark-text' : 'text-gray-500 group-hover:text-gray-700 dark:text-dark-text-muted'}`}>
                          {phase.title}
                        </span>
                      </button>
                    </li>
                    {i < PHASES.length - 1 && (
                      <li
                        aria-hidden
                        className={`mx-3 h-px min-w-[1.5rem] flex-1 transition-colors duration-500 ${done ? 'bg-[#26D07C]' : 'bg-gray-200 dark:bg-dark-border'}`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </ol>
          </nav>

          {activePhase.sections.length > 1 && activePhase.key !== 'commercials' && (
            <div className="mb-6 flex flex-wrap gap-2">
              {activePhase.sections.map((sec) => {
                const st = sectionStatus(sec);
                const on = activeTab === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleTabChange(sec)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'border border-[#26D07C] bg-[#2a2a2a] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-elevated'}`}
                  >
                    {SECTION_LABELS[sec] ?? sec}
                    {st === 'complete' && <span className="text-[#26D07C]">✓</span>}
                    {st === 'attention' && <span className={on ? 'text-amber-300' : 'text-amber-500'}>!</span>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div key={activeTab} className="min-w-0 space-y-8 motion-safe:animate-fade-in-up">

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
          onLogoRemove={handleLogoRemove}
        />
      )}

      {/* Objectives Section */}
      {activeTab === 'Objectives' && (
        <ObjectivesWizard
          formData={formData}
          setFormData={updateFormData}
          selectedAccount={selectedAccount}
          selectedOpportunity={selectedOpportunity}
          onNavChange={setObjectivesNav}
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
      {/* Commercials phase: billing details + pricing/roles, stacked as one view. */}
      {!restrictedTab && activePhase.key === 'commercials' && (
        <>
          {hasUnsavedChanges && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700/40">
              <div className="flex items-center">
                <svg className="mr-2 h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">Unsaved Changes</p>
                  <p className="text-sm">You have unsaved pricing changes. Save before navigating away.</p>
                </div>
              </div>
            </div>
          )}

          <BillingInformationTab
            formData={formData}
            setFormData={updateFormData}
            selectedAccount={selectedAccount}
          />

          <div className="border-t border-gray-200 pt-8 dark:border-dark-border">
            <BillingPaymentTab
              formData={formData}
              setFormData={updateFormData}
              selectedAccount={selectedAccount}
              ref={pricingRef}
            />
          </div>
        </>
      )}

      {/* Pricing-only mode: just the pricing calculator. */}
      {pricingOnly && activeTab === 'Pricing' && (
        <BillingPaymentTab
          formData={formData}
          setFormData={updateFormData}
          selectedAccount={selectedAccount}
          ref={pricingRef}
        />
      )}

      {/* Content Editing Section */}
      {activeTab === 'Content Editing' && (
        <ContentEditingTab
          formData={formData}
          setFormData={updateFormData}
          onUnsavedChanges={setHasUnsavedChanges}
        />
      )}

      {/* Review & Submit Section */}
      {activeTab === REVIEW_STEP_KEY && (
        <ReviewSubmitTab
          formData={formData}
          sowId={initialData?.id}
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
          onGoToSection={(tab) => handleTabChange(tab)}
        />
      )}

      {/* Unified footer: Back · save status · Save all · Next — a single bottom
          bar that replaces the old separate nav row + floating save control.
          The top 4-phase bar is the sole progress indicator (no "Step N of M"). */}
      {(() => {
        const nextKey = !restrictedTab && currentStepIndex < wizardKeys.length - 1 ? wizardKeys[currentStepIndex + 1] : null;
        const nextPhase = nextKey ? PHASES.find((p) => p.sections.includes(nextKey)) : null;
        const nextLabel = !nextKey
          ? 'Next'
          : nextPhase && nextPhase.key !== activePhase.key
            ? `Continue to ${nextPhase.title}`
            : `Next: ${SECTION_LABELS[nextKey] ?? nextKey}`;

        // On the Objectives section the AI sub-stepper publishes its own nav, so
        // the single footer button drives the sub-steps; once past the last
        // sub-step (objNav.onNext is undefined) it falls back to the section nav.
        const objNav = activeTab === 'Objectives' ? objectivesNav : null;
        const onBackClick = objNav?.onPrev ?? (() => goToStep(currentStepIndex - 1));
        const backDisabled = objNav?.onPrev ? false : currentStepIndex <= 0;
        const onNextClick = objNav?.onNext ?? (() => goToStep(currentStepIndex + 1));
        const nextBtnLabel = objNav?.onNext ? `Next: ${objNav.nextLabel ?? ''}` : nextLabel;
        const nextBtnDisabled = objNav?.onNext ? !!objNav.nextDisabled : !nextKey;
        const nextBtnLoading = objNav?.nextLoading ?? false;
        // On the terminal step (Review & Submit) there's nowhere to go next —
        // the action is the in-card "Submit for Review" — so hide the footer
        // Next rather than show a dead, permanently-disabled button.
        const showNextButton = !!nextKey || !!objNav?.onNext;
        const saveIcon = (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
        return (
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-dark-border">
            {!restrictedTab ? (
              <Button
                variant="secondary"
                onClick={onBackClick}
                disabled={backDisabled}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              <span className="hidden text-xs sm:block" aria-live="polite">
                {isSaving ? (
                  <span className="text-gray-500 dark:text-dark-text-subtle">Saving…</span>
                ) : hasUnsavedChanges ? (
                  <span className="font-medium text-yellow-700 dark:text-amber-300">Unsaved changes</span>
                ) : lastSavedAt ? (
                  <span className="text-gray-500 dark:text-dark-text-subtle">
                    Saved at {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-dark-text-subtle">All changes saved</span>
                )}
              </span>
              <Button variant="secondary" onClick={handleSaveAll} loading={isSaving} leftIcon={saveIcon}>
                {restrictedTab ? (pricingOnly ? 'Save Pricing' : 'Save Signers') : 'Save all changes'}
              </Button>
              {!restrictedTab && showNextButton && (
                <Button variant="primary" onClick={onNextClick} disabled={nextBtnDisabled} loading={nextBtnLoading}>
                  {nextBtnLabel}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      </div>{/* end wizard content */}
    </div>
    </div>
  );
}