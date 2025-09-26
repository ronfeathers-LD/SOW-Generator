import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';

import SalesforceIntegration from '../SalesforceIntegration';

interface CustomerInformationTabProps {
  formData: Partial<SOWData>;
  setFormData?: (data: Partial<SOWData>) => void;
  initialData?: SOWData;
  selectedAccount: SalesforceAccount | null;
  selectedOpportunity: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null;
  availableOpportunities: Array<{
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  }>;
  onCustomerSelectedFromSalesforce: (customerData: { account: unknown; opportunities: unknown[] }) => void;
  onOpportunitySelectedFromSalesforce: (opportunity: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null) => void;
  onAvailableOpportunitiesUpdate: (opportunities: Array<{
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  }>) => void;
  getSalesforceLink: (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

type SelectionStep = 'account' | 'opportunity' | 'logo' | null;

export default function CustomerInformationTab({
  formData,
  initialData,
  selectedAccount,
  selectedOpportunity,
  availableOpportunities,
  onCustomerSelectedFromSalesforce,
  onOpportunitySelectedFromSalesforce,
  onAvailableOpportunitiesUpdate,
  getSalesforceLink,
  onLogoChange,
}: CustomerInformationTabProps) {
  
  // 🔍 LOG: Account segment display
  useEffect(() => {
    console.log('🔍 CUSTOMER INFO TAB - Account Segment Display:', {
      selectedAccount: selectedAccount ? {
        Id: selectedAccount.Id,
        Name: selectedAccount.Name,
        Employee_Band__c: selectedAccount.Employee_Band__c
      } : null,
      displayValue: selectedAccount?.Employee_Band__c || 'N/A'
    });
  }, [selectedAccount]);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('account');
  const [, setIsLoadingOpportunities] = useState(false);

  // Debug logging to help troubleshoot account owner issue
  console.log('🔍 CustomerInformationTab Debug:', {
    selectedAccount: selectedAccount ? {
      Id: selectedAccount.Id,
      Name: selectedAccount.Name,
      Owner: selectedAccount.Owner
    } : null,
    initialData: initialData ? {
      salesforce_account_owner_name: initialData.salesforce_account_owner_name,
      salesforce_account_owner_email: initialData.salesforce_account_owner_email,
      salesforce_account_id: initialData.salesforce_account_id
    } : null
  });

  // Helper function to get account owner information
  const getAccountOwnerInfo = () => {
    const hasOwnerFromState = selectedAccount?.Owner?.Name;
    const hasOwnerFromData = initialData?.salesforce_account_owner_name;
    const ownerName = hasOwnerFromState || hasOwnerFromData;
    const hasOwner = hasOwnerFromState || hasOwnerFromData;
    
    return { ownerName, hasOwner };
  };

  const handleStepButtonClick = async (step: SelectionStep) => {
    setCurrentStep(step);
    
    // Load opportunities if we're going to the opportunity step and we have a selected account with a valid ID
    if (step === 'opportunity' && selectedAccount && selectedAccount.Id && availableOpportunities.length === 0) {
      setIsLoadingOpportunities(true);
      try {
        const response = await fetch('/api/salesforce/account-opportunities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: selectedAccount.Id,
            forceRefresh: false // Use cache by default
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update available opportunities through the parent component
          if (data.opportunities) {
            onAvailableOpportunitiesUpdate(data.opportunities);
          }
        } else {
          // Try to get error details
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: 'Failed to parse error response', statusText: response.statusText };
          }
          
          console.error('Failed to load opportunities:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            url: response.url,
            accountId: selectedAccount.id
          });
        }
      } catch (error) {
        console.error('Error loading opportunities:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
      } finally {
        setIsLoadingOpportunities(false);
      }
    }
  };

  // Function to refresh opportunities data
  const refreshOpportunities = async () => {
    if (!selectedAccount?.id) {
      return;
    }
    
    setIsLoadingOpportunities(true);
    try {
      const response = await fetch('/api/salesforce/account-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          forceRefresh: true // Force refresh from Salesforce
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update available opportunities through the parent component
        if (data.opportunities) {
          onAvailableOpportunitiesUpdate(data.opportunities);
        }
        
        // If we have a selected opportunity, make sure it's still in the refreshed list
        if (selectedOpportunity && data.opportunities) {
          const opportunityStillExists = data.opportunities.some((opportunity: unknown) => {
            const opp = opportunity as { id: string };
            // Compare lowercase API id with lowercase selectedOpportunity id
            return opp.id === selectedOpportunity.id;
          });
          if (!opportunityStillExists) {
            onOpportunitySelectedFromSalesforce(null);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to refresh opportunities:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      console.error('Error refreshing opportunities:', error);
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  const handleAccountSelected = (customerData: { account: unknown; opportunities: unknown[] }) => {
    onCustomerSelectedFromSalesforce(customerData);
    // Automatically proceed to opportunity selection since we already have the opportunities
    setCurrentStep('opportunity');
  };

  const handleOpportunitySelected = (opportunity: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null) => {
    onOpportunitySelectedFromSalesforce(opportunity);
    if (opportunity) {
      setCurrentStep('logo');
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Information</h2>
      
      {/* Enhanced Confirmation Checklist */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Required Information Checklist</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Checklist Cards */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Account Check */}
              <div 
                className={`flex items-start p-4 rounded-md border cursor-pointer transition-colors ${
                  currentStep === 'account' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleStepButtonClick('account')}
              >
                <div className="flex-shrink-0 mr-3 mt-1">
                  {selectedAccount ? (
                    <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Account</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {selectedAccount ? (selectedAccount.Name || selectedAccount.name) : 'No account selected'}
                  </p>
                  {selectedAccount && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Account verified in Salesforce</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Account Segment: <span className="font-medium">{selectedAccount.Employee_Band__c || 'N/A'}</span></span>
                      </div>
                      {(() => {
                        const { ownerName, hasOwner } = getAccountOwnerInfo();
                        
                        return (
                          <>
                            {ownerName ? (
                              <div className="flex items-center">
                                <svg className="h-3 w-3 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span>Account Owner: <span className="font-medium">{ownerName}</span></span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <svg className="h-3 w-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-600 font-medium">Account Owner: Missing - Please re-select account</span>
                              </div>
                            )}
                            {!hasOwner && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <strong>⚠️ Action Required:</strong> Account owner information is missing. This is required for SOW approval routing. Please go back to the Account step and re-select the account to capture the owner details.
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <a
                        href={getSalesforceLink(selectedAccount.Id || '', 'Account')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        View in Salesforce
                      </a>
                    </div>
                  )}
                  {!selectedAccount && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-blue-600 font-medium">Click to select</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Opportunity Check */}
              <div 
                className={`flex items-start p-4 rounded-md border transition-colors ${
                  currentStep === 'opportunity' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                } ${!selectedAccount ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => selectedAccount && handleStepButtonClick('opportunity')}
              >
                <div className="flex-shrink-0 mr-3 mt-1">
                  {(selectedOpportunity || (initialData && (initialData.opportunity_id || initialData.template?.opportunity_id))) ? (
                    <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Opportunity</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {selectedOpportunity 
                      ? selectedOpportunity.name
                                        : (initialData?.opportunity_name || initialData?.template?.opportunity_name)
                      ? `${initialData.opportunity_name || initialData.template?.opportunity_name} (stored)`
                        : 'No opportunity selected'
                    }
                  </p>
                  {(selectedOpportunity || (initialData && (initialData.opportunity_id || initialData.template?.opportunity_id))) && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {selectedOpportunity && (
                        <div className="flex items-center">
                          <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Opportunity verified in Salesforce</span>
                        </div>
                      )}
                                          {(selectedOpportunity?.stageName || initialData?.opportunity_stage || initialData?.template?.opportunity_stage) && (
                        <div className="flex items-center">
                          <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                                                  <span>Stage: {selectedOpportunity?.stageName || initialData?.opportunity_stage || initialData?.template?.opportunity_stage}</span>
                        </div>
                      )}
                                          {(selectedOpportunity?.amount || initialData?.opportunity_amount || initialData?.template?.opportunity_amount) && (
                        <div className="flex items-center">
                          <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Amount: {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                                                  }).format(selectedOpportunity?.amount || initialData?.opportunity_amount || initialData?.template?.opportunity_amount || 0)}</span>
                        </div>
                      )}
                                          {(selectedOpportunity?.closeDate || initialData?.opportunity_close_date || initialData?.template?.opportunity_close_date) && (
                        <div className="flex items-center">
                          <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                                                  <span>Close Date: {new Date(selectedOpportunity?.closeDate || initialData?.opportunity_close_date || initialData?.template?.opportunity_close_date || '').toLocaleDateString()}</span>
                        </div>
                      )}
                                          {(selectedOpportunity || initialData?.opportunity_id || initialData?.template?.opportunity_id) && (
                        <a
                                                  href={getSalesforceLink(selectedOpportunity?.id || initialData?.opportunity_id || initialData?.template?.opportunity_id || '', 'Opportunity')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                          View in Salesforce
                        </a>
                      )}
                    </div>
                  )}
                  {!selectedOpportunity && selectedAccount && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-blue-600 font-medium">Click to select</p>
                    </div>
                  )}
                  {(!selectedAccount) && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Select account first</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Logo Upload */}
              <div 
                className={`flex items-start p-4 rounded-md border cursor-pointer transition-colors ${
                  currentStep === 'logo' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleStepButtonClick('logo')}
              >
                <div className="flex-shrink-0 mr-3 mt-1">
                  {(formData.template?.company_logo || formData.header?.company_logo) ? (
                    <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Company Logo</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {(formData.template?.company_logo || formData.header?.company_logo) ? 'Logo uploaded' : 'Optional - upload company logo'}
                  </p>
                  {(formData.template?.company_logo || formData.header?.company_logo) && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Logo uploaded successfully</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Selection Details */}
          <div className="lg:col-span-2">
            {currentStep === 'account' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4 text-blue-800">Step 1: Select Account</h4>
                <SalesforceIntegration 
                  onCustomerSelected={handleAccountSelected}
                  showOnlyAccountSelection={true}
                />
              </div>
            )}

             {currentStep === 'opportunity' && selectedAccount && (
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                 <h4 className="text-lg font-semibold mb-4 text-blue-800">Step 2: Select Opportunity</h4>
                 
                 {availableOpportunities.length > 0 ? (
                   <>
                     <div className="flex justify-between items-center mb-4">
                       <p className="text-sm text-gray-600">
                         Found {availableOpportunities.length} opportunity{availableOpportunities.length !== 1 ? 'ies' : ''} for {selectedAccount.Name || selectedAccount.name}
                       </p>
                       <button 
                         onClick={refreshOpportunities} 
                         className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                       >
                         <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                         </svg>
                         Refresh
                       </button>
                     </div>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                       {availableOpportunities.map((opportunity) => (
                         <div
                           key={opportunity.id}
                           className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                           onClick={() => handleOpportunitySelected(opportunity)}
                         >
                           <div className="font-medium text-gray-900">{opportunity.name}</div>
                           <div className="text-sm text-gray-600 mt-1">
                             <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-2">
                               {opportunity.stageName}
                             </span>
                             {opportunity.amount && (
                               <span className="text-gray-600">
                                 ${opportunity.amount.toLocaleString()}
                               </span>
                             )}
                           </div>
                           {opportunity.closeDate && (
                             <div className="text-xs text-gray-600 mt-1">
                               Close Date: {new Date(opportunity.closeDate).toLocaleDateString()}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                     <p className="text-sm text-yellow-800">
                       No opportunities found for this account. You may need to create opportunities in Salesforce.
                     </p>
                     <button 
                       onClick={refreshOpportunities} 
                       className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                     >
                       <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       Refresh
                     </button>
                   </div>
                 )}
               </div>
             )}

             {currentStep === 'logo' && (
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                 <h4 className="text-lg font-semibold mb-4 text-blue-800">Step 3: Upload Company Logo</h4>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Upload Company Logo (Optional)</label>
                     <input
                       type="file"
                       accept="image/*"
                       onChange={onLogoChange}
                       className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       Supported formats: JPG, PNG, GIF. Maximum size: 5MB.
                     </p>
                   </div>
                   
                   {/* Logo Preview */}
                   {(formData.template?.company_logo || formData.header?.company_logo) && (
                     <div className="bg-white border border-gray-200 rounded-md p-4">
                       <h5 className="text-sm font-medium text-gray-900 mb-2">Logo Preview</h5>
                       <Image
                         src={formData.template?.company_logo || formData.header?.company_logo || ''}
                         alt="Company Logo"
                         width={128}
                         height={128}
                         className="max-h-32 max-w-full object-contain border border-gray-200 rounded"
                       />
                     </div>
                   )}
                   
                   <div className="bg-green-50 border border-green-200 rounded-md p-4">
                     <div className="flex">
                       <div className="flex-shrink-0">
                         <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <div className="ml-3">
                         <h3 className="text-sm font-medium text-green-800">Logo Upload</h3>
                         <div className="mt-2 text-sm text-green-700">
                           <p>The logo upload is optional and can be completed at any time. You can also upload a logo later if needed.</p>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}

            {!currentStep && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Selection Instructions</h4>
                <p className="text-gray-600">
                  Click on any of the cards on the left to begin the selection process. You&apos;ll need to select an account first, then an opportunity.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Status */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Customer Information</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>All customer information will be automatically saved when you click the save button.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 