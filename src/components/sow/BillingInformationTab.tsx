import React, { useState, useEffect } from 'react';
import { SOWData, SOWTemplate } from '@/types/sow';
import { SalesforceContact } from '@/lib/salesforce';
import LoadingModal from '@/components/ui/LoadingModal';

interface BillingInformationTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount: { id: string; name: string } | null;
}

export default function BillingInformationTab({
  formData,
  setFormData,
  selectedAccount,
}: BillingInformationTabProps) {
  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showBillingContactSelection, setShowBillingContactSelection] = useState<boolean>(false);
  
  // Billing information state
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  
  // Loading states for billing contact operations
  const [isSavingBillingContact, setIsSavingBillingContact] = useState(false);
  const [isClearingBillingContact, setIsClearingBillingContact] = useState(false);

  // Load contacts when account is selected
  useEffect(() => {
    if (selectedAccount?.id) {
      loadContacts(selectedAccount.id);
    }
  }, [selectedAccount?.id]);

  const loadContacts = async (accountId: string) => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch('/api/salesforce/account-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const refreshContacts = async () => {
    if (!selectedAccount?.id) return;
    await loadContacts(selectedAccount.id);
  };

  const handleBillingContactSelected = async (contact: SalesforceContact) => {
    setIsSavingBillingContact(true);
    
    try {
      // Update local form data for billing contact
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          billing_contact_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
          billing_email: contact.Email || '',
        }
      });

      // Asynchronously save the Billing Contact selection via tab-update
      if (formData.id) {
        const requestBody = {
          tab: 'Billing Information',
          data: {
            template: {
              billing_contact_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
              billing_email: contact.Email || '',
            }
          }
        };
        
        const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          console.error('Failed to save Billing Contact, status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } else {
        console.warn('No formData.id available, skipping save');
      }

      setShowBillingContactSelection(false);
    } catch (error) {
      console.error('Error saving Billing Contact:', error);
    } finally {
      setIsSavingBillingContact(false);
    }
  };

  const clearBillingContact = async () => {
    setIsClearingBillingContact(true);
    
    try {
      // Update local form data
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          billing_contact_name: '',
          billing_email: '',
        }
      });

      // Save to database
      if (formData.id) {
        const requestBody = {
          tab: 'Billing Information',
          data: {
            template: {
              billing_contact_name: '',
              billing_email: '',
            }
          }
        };
        
        const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          console.error('Failed to clear Billing Contact, status:', response.status);
        }
      }
    } catch (error) {
      console.error('Error clearing Billing Contact:', error);
    } finally {
      setIsClearingBillingContact(false);
    }
  };

  // Billing information functions
  const fetchBillingFromSalesforce = async () => {
    if (!selectedAccount?.id) {
      setBillingError('No account selected. Please select a customer first.');
      return;
    }

    setIsLoadingBilling(true);
    setBillingError(null);

    try {
      const response = await fetch(`/api/salesforce/billing-info?accountId=${selectedAccount.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing information');
      }

      const data = await response.json();
      const billingInfo = data.billingInfo;

      // Preserve existing billing contact information if it exists
      const existingBillingContact = formData.template?.billing_contact_name || '';
      const existingBillingEmail = formData.template?.billing_email || '';

      const updatedFormData = {
        ...formData,
        template: {
          ...(formData.template || {}),
          billing_company_name: billingInfo.companyName || formData.template?.client_name || '',
          billing_address: billingInfo.billingAddress || '',
          // Only update billing contact if we don't already have one
          billing_contact_name: existingBillingContact || billingInfo.billingContact || '',
          billing_email: existingBillingEmail || billingInfo.billingEmail || '',
        },
      };

      // Update local state
      setFormData(updatedFormData as SOWData);

      // Save to database
      if (formData.id) {
        try {
          const saveResponse = await fetch(`/api/sow/${formData.id}/tab-update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tab: 'Billing Information',
              data: {
                template: {
                  billing_company_name: billingInfo.companyName || formData.template?.client_name || '',
                  billing_address: billingInfo.billingAddress || '',
                  billing_contact_name: existingBillingContact || billingInfo.billingContact || '',
                  billing_email: existingBillingEmail || billingInfo.billingEmail || '',
                }
              }
            }),
          });

          if (!saveResponse.ok) {
            console.warn('Failed to save billing info to database, but local state was updated');
          }
        } catch (saveError) {
          console.warn('Error saving billing info to database:', saveError);
          // Don't fail the whole operation if save fails
        }
      }

      setBillingSuccess('Billing information loaded from Salesforce successfully!');
      setTimeout(() => setBillingSuccess(null), 3000);
    } catch (error) {
      setBillingError('Failed to fetch billing information from Salesforce');
      console.error('Error fetching billing info:', error);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const saveBillingInfo = async () => {
    if (!formData.id) {
      console.error('No SOW ID available for billing info save');
      return;
    }

    try {
      const requestBody = {
        tab: 'Billing Information',
        data: {
          template: {
            billing_company_name: formData.template?.billing_company_name || '',
            billing_address: formData.template?.billing_address || '',
            purchase_order_number: formData.template?.purchase_order_number || '',
          }
        }
      };

      const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to save billing information');
      }

      setBillingSuccess('Billing information saved successfully!');
      setTimeout(() => setBillingSuccess(null), 3000);
    } catch (error) {
      setBillingError('Failed to save billing information');
      console.error('Error saving billing info:', error);
    }
  };

  return (
    <section className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing Information</h2>
          <p className="text-sm text-gray-600">
            Configure billing contact and billing details for this SOW
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Billing Contact */}
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">Billing Contact</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select the billing contact for this SOW
              </p>
              
              {!selectedAccount ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    Please select a customer account first in the Customer Information tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Billing Contact Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Current Billing Contact</h4>
                        <p className="text-sm text-gray-600">
                          {formData.template?.billing_contact_name || 'No billing contact selected'}
                        </p>
                        {formData.template?.billing_contact_name && (
                          <div className="text-xs text-gray-600 space-y-1 mt-2">
                            {formData.template?.billing_email && (
                              <div className="flex items-center">
                                <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Email: {formData.template.billing_email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowBillingContactSelection(true)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          {formData.template?.billing_contact_name ? 'Change Contact' : 'Select Contact'}
                        </button>
                        {formData.template?.billing_contact_name && (
                          <button
                            type="button"
                            onClick={clearBillingContact}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                          >
                            Clear Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Contact Selection Modal */}
                  {showBillingContactSelection && selectedAccount && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                          {/* Modal Header */}
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Select Billing Contact</h3>
                            <button
                              type="button"
                              onClick={() => setShowBillingContactSelection(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Modal Content */}
                          <div className="space-y-4">
                            {isLoadingContacts ? (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800">Loading contacts...</p>
                              </div>
                            ) : availableContacts.length > 0 ? (
                              <>
                                <div className="flex justify-between items-center mb-4">
                                  <p className="text-sm text-gray-600">
                                    Found {availableContacts.length} contact{availableContacts.length !== 1 ? 's' : ''} for {selectedAccount.name}
                                  </p>
                                  <button
                                    onClick={refreshContacts}
                                    disabled={isLoadingContacts}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                  >
                                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                  </button>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {availableContacts.map((contact) => (
                                    <div
                                      key={contact.Id}
                                      className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                      onClick={() => handleBillingContactSelected(contact)}
                                    >
                                      <div className="font-medium text-gray-900">{contact.FirstName} {contact.LastName}</div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-2">
                                          {contact.Title}
                                        </span>
                                        <span>{contact.Email}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800">
                                  No contacts found for {selectedAccount.name}. Please ensure contacts exist in Salesforce.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Modal Footer */}
                          <div className="flex justify-end mt-6">
                            <button
                              type="button"
                              onClick={() => setShowBillingContactSelection(false)}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Billing Details */}
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-green-800">Billing Details</h3>
                {selectedAccount && (
                  <button
                    type="button"
                    onClick={fetchBillingFromSalesforce}
                    disabled={isLoadingBilling}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingBilling ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Get from Salesforce
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Error and Success Messages */}
              {billingError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-800">{billingError}</span>
                  </div>
                </div>
              )}

              {billingSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-800">{billingSuccess}</span>
                  </div>
                </div>
              )}

              {/* Billing Information Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    value={formData.template?.billing_company_name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      template: { ...(formData.template || {}), billing_company_name: e.target.value } as SOWTemplate,
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Company name for billing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                  <textarea
                    value={formData.template?.billing_address || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      template: { ...(formData.template || {}), billing_address: e.target.value } as SOWTemplate,
                    })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Billing address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Purchase Order Number</label>
                  <input
                    type="text"
                    value={formData.template?.purchase_order_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      template: { ...(formData.template || {}), purchase_order_number: e.target.value } as SOWTemplate,
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Purchase order number (optional)"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={saveBillingInfo}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Save Billing Information
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modals */}
      <LoadingModal 
        isOpen={isLoadingContacts} 
        operation="loading"
        message="Fetching contacts from Salesforce..."
      />
      
      <LoadingModal 
        isOpen={isLoadingBilling} 
        operation="loading"
        message="Loading billing information..."
      />
      
      <LoadingModal 
        isOpen={isSavingBillingContact} 
        operation="saving"
        message="Saving billing contact selection..."
      />
      
      <LoadingModal 
        isOpen={isClearingBillingContact} 
        operation="updating"
        message="Clearing billing contact information..."
      />
    </section>
  );
}
