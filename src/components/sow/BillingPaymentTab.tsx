import React, { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceContact } from '@/lib/salesforce';

interface BillingPaymentTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccountId?: string;
  selectedAccount: { id: string; name: string } | null;
  selectedBillingContact: SalesforceContact | null;
  onBillingContactSelectedFromSalesforce: (contact: SalesforceContact | null) => void;
  getSalesforceLink: (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => string;
}

export default function BillingPaymentTab({
  formData,
  setFormData,
  selectedAccountId,
  selectedAccount,
  selectedBillingContact,
  onBillingContactSelectedFromSalesforce,
  getSalesforceLink,
}: BillingPaymentTabProps) {
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showBillingContactSelection, setShowBillingContactSelection] = useState<boolean>(false);

  // Load contacts when account is selected
  useEffect(() => {
    if (selectedAccount?.id) {
      loadContacts(selectedAccount.id);
      
      // Show contact selection if no billing contact is currently selected
      const hasBillingContactInfo = selectedBillingContact || 
                                   formData.template?.billing_contact_name || 
                                   formData.pricing?.billing?.billing_contact;
      
      const shouldShowSelection = !hasBillingContactInfo;
      setShowBillingContactSelection(shouldShowSelection);
    }
  }, [selectedAccount?.id, selectedBillingContact, formData.template?.billing_contact_name, formData.pricing?.billing?.billing_contact]);

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

  const handleBillingContactSelected = (contact: SalesforceContact | null) => {
    onBillingContactSelectedFromSalesforce(contact);
    if (contact) {
      setShowBillingContactSelection(false);
    }
  };

  const fetchBillingFromSalesforce = async () => {
    if (!selectedAccountId) {
      setBillingError('No account selected. Please select a customer first.');
      return;
    }

    setIsLoadingBilling(true);
    setBillingError(null);

    try {
      const response = await fetch(`/api/salesforce/billing-info?accountId=${selectedAccountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing information');
      }

      const data = await response.json();
      const billingInfo = data.billingInfo;

      // Update form data with billing information from Salesforce
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          billing_company_name: billingInfo.companyName || formData.template?.customer_name || '',
          billing_contact_name: billingInfo.billingContact || '',
          billing_address: billingInfo.billingAddress || '',
          billing_email: billingInfo.billingEmail || '',
        },
        pricing: {
          ...formData.pricing!,
          billing: {
            ...formData.pricing?.billing!,
            company_name: billingInfo.companyName || formData.template?.customer_name || '',
            billing_contact: billingInfo.billingContact || '',
            billing_address: billingInfo.billingAddress || '',
            billing_email: billingInfo.billingEmail || '',
          }
        }
      });

      setBillingSuccess('Billing information loaded from Salesforce successfully!');

      setBillingError(null);
      setBillingSuccess(null);
    } catch (error) {
      console.error('Error fetching billing info:', error);
      setBillingError('Failed to fetch billing information from Salesforce');
    } finally {
      setIsLoadingBilling(false);
    }
  };
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Billing & Payment</h2>
      
      {/* Billing Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Billing Information</h3>
        </div>
        
        {billingError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{billingError}</p>
          </div>
        )}
        
        {billingSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{billingSuccess}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Company Info & Address */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                value={formData.pricing?.billing?.company_name || formData.template?.billing_company_name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template!, billing_company_name: e.target.value },
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, company_name: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing Address</label>
              <input
                type="text"
                value={formData.pricing?.billing?.billing_address || formData.template?.billing_address || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template!, billing_address: e.target.value },
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, billing_address: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Purchase Order Number</label>
              <input
                type="text"
                value={formData.pricing?.billing?.po_number || formData.template?.purchase_order_number || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template!, purchase_order_number: e.target.value },
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, po_number: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="N/A"
              />
            </div>
            {selectedAccountId && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={fetchBillingFromSalesforce}
                  disabled={isLoadingBilling}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Get from Salesforce
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Contact Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing Contact Name</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.pricing?.billing?.billing_contact || formData.template?.billing_contact_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    template: { ...formData.template!, billing_contact_name: e.target.value },
                    pricing: {
                      ...formData.pricing!,
                      billing: { ...formData.pricing?.billing!, billing_contact: e.target.value }
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {selectedAccount && (
                  <button
                    type="button"
                    onClick={() => setShowBillingContactSelection(!showBillingContactSelection)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
              </div>
              {selectedBillingContact && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedBillingContact.FirstName} {selectedBillingContact.LastName}
                    {selectedBillingContact.Email && (
                      <span className="ml-2 text-blue-600">({selectedBillingContact.Email})</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing Email</label>
              <input
                type="email"
                value={formData.pricing?.billing?.billing_email || formData.template?.billing_email || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template!, billing_email: e.target.value },
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, billing_email: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Billing Contact Selection - Inline */}
            {showBillingContactSelection && selectedAccount && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="text-md font-semibold mb-3 text-blue-800">Select Billing Contact</h4>
                
                <div className="space-y-3">
                  {isLoadingContacts ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">Loading contacts...</p>
                    </div>
                  ) : availableContacts.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-600">
                          Found {availableContacts.length} contact{availableContacts.length !== 1 ? 's' : ''} for {selectedAccount.name}
                        </p>
                        <button
                          onClick={refreshContacts}
                          disabled={isLoadingContacts}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableContacts.map((contact) => (
                          <div
                            key={contact.Id}
                            className="p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-white transition-colors"
                            onClick={() => handleBillingContactSelected(contact)}
                          >
                            <div className="font-medium text-gray-900 text-sm">{contact.FirstName} {contact.LastName}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-1">
                                {contact.Title}
                              </span>
                              <span>{contact.Email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        No contacts found for {selectedAccount.name}. Please ensure contacts exist in Salesforce.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );
} 