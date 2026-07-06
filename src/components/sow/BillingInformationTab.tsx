import React, { useState, useEffect } from 'react';
import { SOWData, SOWTemplate } from '@/types/sow';
import { SalesforceAccount, SalesforceContact } from '@/lib/salesforce';
import LoadingModal from '@/components/ui/LoadingModal';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  SectionHeader,
  Textarea,
} from '@/components/ui/form';

interface BillingInformationTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount: SalesforceAccount | null;
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

  // Clear billing error when selectedAccount is available
  useEffect(() => {
    if (selectedAccount && billingError) {
      setBillingError(null);
    }
  }, [selectedAccount, billingError]);

  // Load contacts when account is selected
  useEffect(() => {
    if (selectedAccount?.Id) {
      loadContacts(selectedAccount.Id);
    }
  }, [selectedAccount?.Id]);

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
    if (!selectedAccount?.Id) return;
    await loadContacts(selectedAccount.Id);
  };

  // All mutations below go through `setFormData` only, which the parent wires
  // to `updateFormData` — that marks the form dirty and the global autosave
  // loop in SOWForm persists it, so nothing here needs its own PUT.

  const handleBillingContactSelected = (contact: SalesforceContact) => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        billing_contact_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
        billing_email: contact.Email || '',
      },
    });
    setShowBillingContactSelection(false);
  };

  const clearBillingContact = () => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        billing_contact_name: '',
        billing_email: '',
      },
    });
  };

  // Billing information functions
  const fetchBillingFromSalesforce = async () => {
    if (!selectedAccount?.Id) {
      setBillingError('No account selected. Please select a customer first.');
      return;
    }

    setIsLoadingBilling(true);
    setBillingError(null);

    try {
      const response = await fetch(`/api/salesforce/billing-info?accountId=${selectedAccount.Id}`);
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

      // Update local state — this marks the form dirty and the global
      // autosave loop in SOWForm persists it.
      setFormData(updatedFormData as SOWData);

      setBillingSuccess('Billing information loaded from Salesforce successfully!');
      setTimeout(() => setBillingSuccess(null), 3000);
    } catch (error) {
      setBillingError('Failed to fetch billing information from Salesforce');
      console.error('Error fetching billing info:', error);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  // Helper to update a single billing template field locally.
  const updateTemplateField = (field: keyof SOWTemplate, value: string) => {
    setFormData({
      ...formData,
      template: { ...(formData.template || {}), [field]: value } as SOWTemplate,
    });
  };

  const billingContactName = formData.template?.billing_contact_name;

  return (
    <section className="space-y-8">
      <Card padding="md">
        <SectionHeader
          title="Billing Information"
          description="Configure billing contact and billing details for this SOW"
          className="mb-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Billing Contact */}
          <Card tone="info" padding="md" className="space-y-4">
            <SectionHeader
              as="h3"
              title="Billing Contact"
              description="Select the billing contact for this SOW"
            />

            {!selectedAccount ? (
              <Alert tone="warning">
                Please select a customer account first in the Customer Information tab.
              </Alert>
            ) : (
              <>
                {/* Current Billing Contact Display */}
                <Card tone="muted" padding="sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Current Billing Contact</h4>
                      <p className="text-sm text-gray-600">
                        {billingContactName || 'No billing contact selected'}
                      </p>
                      {billingContactName && formData.template?.billing_email && (
                        <p className="mt-2 text-xs text-gray-600">
                          Email: {formData.template.billing_email}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowBillingContactSelection(true)}
                      >
                        {billingContactName ? 'Change Contact' : 'Select Contact'}
                      </Button>
                      {billingContactName && (
                        <Button variant="danger" size="sm" onClick={clearBillingContact}>
                          Clear Contact
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Billing Contact Selection Modal */}
                {showBillingContactSelection && selectedAccount && (
                  <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
                    <div className="relative top-20 mx-auto w-11/12 rounded-md border bg-white p-5 shadow-lg md:w-3/4 lg:w-1/2">
                      <div className="mt-3">
                        {/* Modal Header */}
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Select Billing Contact</h3>
                          <button
                            type="button"
                            onClick={() => setShowBillingContactSelection(false)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label="Close"
                          >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Modal Content */}
                        <div className="space-y-4">
                          {isLoadingContacts ? (
                            <Alert tone="warning">Loading contacts...</Alert>
                          ) : availableContacts.length > 0 ? (
                            <>
                              <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                  Found {availableContacts.length} contact{availableContacts.length !== 1 ? 's' : ''} for{' '}
                                  {selectedAccount.Name || selectedAccount.name}
                                </p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={refreshContacts}
                                  loading={isLoadingContacts}
                                >
                                  Refresh
                                </Button>
                              </div>
                              <div className="max-h-96 space-y-2 overflow-y-auto">
                                {availableContacts.map((contact) => (
                                  <div
                                    key={contact.Id}
                                    className="cursor-pointer rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                    onClick={() => handleBillingContactSelected(contact)}
                                  >
                                    <div className="font-medium text-gray-900">
                                      {contact.FirstName} {contact.LastName}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600">
                                      <span className="mr-2 inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                        {contact.Title}
                                      </span>
                                      <span>{contact.Email}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <Alert tone="warning">
                              No contacts found for {selectedAccount.Name || selectedAccount.name}. Please ensure contacts
                              exist in Salesforce.
                            </Alert>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex justify-end">
                          <Button variant="secondary" onClick={() => setShowBillingContactSelection(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Right Column - Billing Details */}
          <Card tone="success" padding="md" className="space-y-4">
            <SectionHeader
              as="h3"
              title="Billing Details"
              action={
                selectedAccount && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={fetchBillingFromSalesforce}
                    loading={isLoadingBilling}
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                  >
                    Get from Salesforce
                  </Button>
                )
              }
            />

            {/* Error and Success Messages */}
            {billingError && <Alert tone="error">{billingError}</Alert>}
            {billingSuccess && <Alert tone="success">{billingSuccess}</Alert>}

            {/* Billing Information Fields */}
            <div className="space-y-4">
              <Field label="Company Name">
                <Input
                  value={formData.template?.billing_company_name || ''}
                  onChange={(e) => updateTemplateField('billing_company_name', e.target.value)}
                  placeholder="Company name for billing"
                />
              </Field>

              <Field label="Billing Address">
                <Textarea
                  value={formData.template?.billing_address || ''}
                  onChange={(e) => updateTemplateField('billing_address', e.target.value)}
                  rows={3}
                  placeholder="Billing address"
                />
              </Field>

              <Field label="Purchase Order Number" hint="Optional">
                <Input
                  value={formData.template?.purchase_order_number || ''}
                  onChange={(e) => updateTemplateField('purchase_order_number', e.target.value)}
                  placeholder="Purchase order number"
                />
              </Field>

              <Field label="Payment Terms" hint="Optional">
                <Input
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Payment terms"
                />
              </Field>
            </div>
          </Card>
        </div>
      </Card>

      {/* Loading Modals */}
      <LoadingModal isOpen={isLoadingContacts} operation="loading" message="Fetching contacts from Salesforce..." />
      <LoadingModal isOpen={isLoadingBilling} operation="loading" message="Loading billing information..." />
    </section>
  );
}
