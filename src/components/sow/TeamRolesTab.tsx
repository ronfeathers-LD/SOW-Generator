import React, { useState, useEffect } from 'react';
import { SOWData, SOWTemplate } from '@/types/sow';
import { SalesforceContact } from '@/lib/salesforce';
import LoadingModal from '@/components/ui/LoadingModal';

interface TeamRolesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  leanDataSignatories: Array<{ id: string; name: string; email: string; title: string }>;
  selectedLeanDataSignatory: string;
  onLeanDataSignatoryChange: (signatoryId: string) => void;
  // New props for signer selection
  selectedAccount: { id: string; name: string } | null;
  selectedContact: SalesforceContact | null;
  getSalesforceLink: (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => string;
}

export default function TeamRolesTab({
  formData,
  setFormData,
  leanDataSignatories,
  selectedLeanDataSignatory,
  onLeanDataSignatoryChange,
  selectedAccount,
  selectedContact,
  getSalesforceLink,
}: TeamRolesTabProps) {

  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showSignerContactSelection, setShowSignerContactSelection] = useState<boolean>(false);
  const [showSecondSignerContactSelection, setShowSecondSignerContactSelection] = useState<boolean>(false);
  const [showRoleContactSelection, setShowRoleContactSelection] = useState<number | null>(null);
  const [showSecondSignerSection, setShowSecondSignerSection] = useState<boolean>(false);
  
  // Billing information state
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  const [showBillingContactSelection, setShowBillingContactSelection] = useState<boolean>(false);
  
  // Loading states for contact operations
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isClearingContact, setIsClearingContact] = useState(false);
  const [isSavingBillingContact, setIsSavingBillingContact] = useState(false);
  const [isClearingBillingContact, setIsClearingBillingContact] = useState(false);

  // Load contacts when account is selected and set initial contact selection state
  useEffect(() => {
    if (selectedAccount?.id) {
      loadContacts(selectedAccount.id);
    }
  }, [selectedAccount?.id]); // Only depend on account ID

  // Handle contact selection state separately
  useEffect(() => {
    if (selectedAccount?.id) {
      // Show contact selection if no contact is currently selected
      // Check both selectedContact and formData for contact information
      const hasContactInfo = selectedContact || 
                           formData.template?.customer_signature_name || 
                           formData.salesforce_contact_id;
      
      const shouldShowSelection = !hasContactInfo;
      setShowSignerContactSelection(shouldShowSelection);
    }
  }, [selectedAccount?.id, selectedContact, formData.template?.customer_signature_name, formData.salesforce_contact_id]);

  // Auto-show second signer section if there's already a second signer
  useEffect(() => {
    if (formData.template?.customer_signature_name_2) {
      setShowSecondSignerSection(true);
    }
  }, [formData.template?.customer_signature_name_2]);

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

  const handleContactSelected = async (contact: SalesforceContact) => {
    setIsSavingContact(true);
    
    try {
      // Update local form data for first signer
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customer_signature_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
          customer_email: contact.Email || '',
          customer_signature: contact.Title || '',
        }
      });

      // Asynchronously save the Customer Signer selection via tab-update
      if (formData.id) {
        const requestBody = {
          tab: 'Team & Roles',
          data: {
            template: {
              customer_signature_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
              customer_email: contact.Email || '',
              customer_signature: contact.Title || '',
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
          console.error('Failed to save Customer Signer, status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } else {
        console.warn('No formData.id available, skipping save');
      }

      setShowSignerContactSelection(false);
    } catch (error) {
      console.error('Error saving Customer Signer:', error);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSecondSignerContactSelected = async (contact: SalesforceContact) => {
    setIsSavingContact(true);
    
    try {
      // Update local form data for second signer
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          customer_signature_name_2: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
          customer_email_2: contact.Email || '',
          customer_signature_2: contact.Title || '',
        }
      });

      // Asynchronously save the Second Customer Signer selection via tab-update
      if (formData.id) {
        const requestBody = {
          tab: 'Team & Roles',
          data: {
            template: {
              customer_signature_name_2: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
              customer_email_2: contact.Email || '',
              customer_signature_2: contact.Title || '',
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
          console.error('Failed to save Second Customer Signer, status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } else {
        console.warn('No formData.id available, skipping save');
      }

      setShowSecondSignerContactSelection(false);
    } catch (error) {
      console.error('Error saving Second Customer Signer:', error);
    } finally {
      setIsSavingContact(false);
    }
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
          tab: 'Team & Roles',
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

  const handleContactSelectedForRole = (contact: SalesforceContact, roleIndex: number) => {
    const newRoles = [...(formData.roles?.client_roles || [])];
    newRoles[roleIndex] = { 
      ...newRoles[roleIndex], 
      name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
      email: contact.Email || '',
      salesforce_contact_id: contact.Id,
      contact_title: contact.Title,
      role: contact.Title || '' // Auto-populate role with contact title
    };
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: newRoles }
    });
    setShowRoleContactSelection(null);
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
              tab: 'Team & Roles',
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



  // Clear primary signer function
  const clearPrimarySigner = async () => {
    if (!formData.id) {
      console.error('No SOW ID available');
      return;
    }

    setIsClearingContact(true);
    
    try {
      // Update local form data
      const updatedFormData = {
        ...formData,
        template: {
          ...formData.template!,
          customer_signature: '',
          customer_email: '',
          customer_signature_name: ''
        },
        salesforce_contact_id: undefined
      };
      setFormData(updatedFormData);

      // Save to database
      const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: 'Team & Roles',
          data: {
            template: {
              customer_signature: '',
              customer_email: '',
              customer_signature_name: ''
            },
            salesforce_contact_id: null
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear primary signer: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error clearing primary signer:', error);
    } finally {
      setIsClearingContact(false);
    }
  };

  // Clear secondary signer function
  const clearSecondarySigner = async () => {
    if (!formData.id) {
      console.error('No SOW ID available');
      return;
    }

    setIsClearingContact(true);
    
    try {
      // Update local form data
      const updatedFormData = {
        ...formData,
        template: {
          ...formData.template!,
          customer_signature_name_2: '',
          customer_email_2: '',
          customer_signature_2: ''
        }
      };
      setFormData(updatedFormData);

      // Save to database
      const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: 'Team & Roles',
          data: {
            template: {
              customer_signature_name_2: '',
              customer_signature_2: ''
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear secondary signer: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error clearing secondary signer:', error);
    } finally {
      setIsClearingContact(false);
    }
  };

  // Clear billing contact function
  const clearBillingContact = async () => {
    if (!formData.id) {
      console.error('No SOW ID available');
      return;
    }

    setIsClearingBillingContact(true);
    
    try {
      // Update local form data
      const updatedFormData = {
        ...formData,
        template: {
          ...formData.template!,
          billing_contact_name: '',
          billing_email: ''
        }
      };
      setFormData(updatedFormData);

      // Save to database
      const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: 'Team & Roles',
          data: {
            template: {
              billing_contact_name: '',
              billing_email: ''
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear billing contact: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error clearing billing contact:', error);
    } finally {
      setIsClearingBillingContact(false);
    }
  };

  // Clear client role contact function
  const clearRoleContact = (roleIndex: number) => {
    const newRoles = [...(formData.roles?.client_roles || [])];
    newRoles[roleIndex] = { 
      ...newRoles[roleIndex], 
      name: '',
      email: '',
      salesforce_contact_id: undefined,
      contact_title: '',
      role: ''
    };
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: newRoles }
    });
  };


  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team & Roles</h2>
        <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-md">
          <svg className="inline w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Changes are automatically saved
        </div>
      </div>
      
      {/* Signatories Section - 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Signer - Top Left */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Customer Signer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the customer contact who will sign this SOW
            </p>
            
            {!selectedAccount ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  Please select a customer account first in the Customer Information tab.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Signer Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Current Signer</h4>
                      <p className="text-sm text-gray-600">
                        {formData.template?.customer_signature_name || 'No signer selected'}
                      </p>
                      {formData.template?.customer_signature_name && (
                        <div className="text-xs text-gray-600 space-y-1 mt-2">
                          {/* Show "Contact verified in Salesforce" if we have a Salesforce contact ID */}
                          {formData.salesforce_contact_id && (
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Contact verified in Salesforce</span>
                            </div>
                          )}
                          {formData.template?.customer_email && (
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Email: {formData.template.customer_email}</span>
                            </div>
                          )}
                          {formData.template?.customer_signature && (
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Title: {formData.template.customer_signature}</span>
                            </div>
                          )}
                          {/* Show "View in Salesforce" link if we have a Salesforce contact ID */}
                          {formData.salesforce_contact_id && (
                            <a
                              href={getSalesforceLink(formData.salesforce_contact_id, 'Contact')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline flex items-center"
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
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowSignerContactSelection(true)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                      >
                        {formData.template?.customer_signature_name ? 'Change Signer' : 'Select Signer'}
                      </button>
                      {formData.template?.customer_signature_name && (
                        <button
                          type="button"
                          onClick={clearPrimarySigner}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Clear Signer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Selection Modal */}
                {showSignerContactSelection && selectedAccount && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                      <div className="mt-3">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Select Customer Signer</h3>
                          <button
                            type="button"
                            onClick={() => setShowSignerContactSelection(false)}
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
                                    onClick={() => handleContactSelected(contact)}
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
                            onClick={() => setShowSignerContactSelection(false)}
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

          {/* Second Customer Signer - Bottom Left */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Second Customer Signer</h3>
                {!showSecondSignerSection && (
                  <p className="text-sm text-gray-600 mt-1">
                    Optional - Select a second customer contact who will sign this SOW
                  </p>
                )}
              </div>
              {!showSecondSignerSection && (
                <button
                  type="button"
                  onClick={() => setShowSecondSignerSection(true)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Add Second Signer
                </button>
              )}
            </div>
            
            {!selectedAccount ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  Please select a customer account first in the Customer Information tab.
                </p>
              </div>
            ) : showSecondSignerSection ? (
              <div className="space-y-4">
                {/* Current Second Signer Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Current Second Signer</h4>
                      <p className="text-sm text-gray-600">
                        {formData.template?.customer_signature_name_2 || 'No second signer selected'}
                      </p>
                      {formData.template?.customer_signature_name_2 && (
                        <div className="text-xs text-gray-600 space-y-1 mt-2">
                          {formData.template?.customer_email_2 && (
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Email: {formData.template.customer_email_2}</span>
                            </div>
                          )}
                          {formData.template?.customer_signature_2 && (
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Title: {formData.template.customer_signature_2}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowSecondSignerContactSelection(true)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                      >
                        {formData.template?.customer_signature_name_2 ? 'Change Signer' : 'Select Signer'}
                      </button>
                      {formData.template?.customer_signature_name_2 && (
                        <button
                          type="button"
                          onClick={clearSecondarySigner}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Clear Signer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Second Signer Contact Selection Modal */}
                {showSecondSignerContactSelection && selectedAccount && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                      <div className="mt-3">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Select Second Customer Signer</h3>
                          <button
                            type="button"
                            onClick={() => setShowSecondSignerContactSelection(false)}
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
                                    onClick={() => handleSecondSignerContactSelected(contact)}
                                  >
                                    <div className="font-medium text-gray-900">{contact.FirstName} {contact.LastName}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
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
                            onClick={() => setShowSecondSignerContactSelection(false)}
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
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  Click &ldquo;Add Second Signer&rdquo; to select an additional customer signer
                </p>
              </div>
            )}
            
            {showSecondSignerSection && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowSecondSignerSection(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hide Second Signer Section
                </button>
              </div>
            )}
          </div>

          {/* Billing Contact - Bottom Left */}
          <div className="bg-white shadow rounded-lg p-6">
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

        {/* Right Column */}
        <div className="space-y-6">
           {/* LeanData Signatory - Top Right */}
           <div className="bg-white shadow rounded-lg p-6">
             <h3 className="text-lg font-semibold mb-4 text-green-800">LeanData Signatory</h3>
             <p className="text-sm text-gray-600 mb-4">
               Select the LeanData representative who will sign this SOW
             </p>
             <select
               value={selectedLeanDataSignatory}
               onChange={(e) => onLeanDataSignatoryChange(e.target.value)}
               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
             >
               <option value="">Select a signatory</option>
               {leanDataSignatories.map((signatory) => (
                 <option key={signatory.id} value={signatory.id}>
                   {signatory.name} - {signatory.title}
                 </option>
               ))}
             </select>
             {selectedLeanDataSignatory && (
               <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Signatory</h4>
                 <div className="font-medium text-gray-900">
                   {leanDataSignatories.find(s => s.id === selectedLeanDataSignatory)?.name}
                 </div>
                 <div className="text-sm text-gray-600">
                   {leanDataSignatories.find(s => s.id === selectedLeanDataSignatory)?.title}
                 </div>
               </div>
             )}
           </div>

           {/* Billing Information - Bottom Right */}
           <div className="bg-white shadow rounded-lg p-6">
           <div className="mb-4 flex justify-between items-center">
             <h3 className="text-lg font-semibold">Billing Information</h3>
             {selectedAccount && (
               <button
                 type="button"
                 onClick={fetchBillingFromSalesforce}
                 disabled={isLoadingBilling}
                 className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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


           </div>
         </div>
       </div>
     </div>
     
     {/* Client Roles */}
     <div className="bg-white shadow rounded-lg p-6">
       <h3 className="text-lg font-semibold mb-4">Client Roles & Responsibilities</h3>
       <p className="text-sm text-gray-600 mb-4">
         Define the roles and responsibilities for the client team
       </p>
        {formData.roles?.client_roles?.map((role, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Contact Selection - Left Side (40%) */}
              <div className="lg:col-span-2">
                <h4 className="text-md font-semibold mb-3 text-blue-800">Select Contact</h4>
                {!selectedAccount ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      Please select a customer account first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Current Contact Display */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            {role.name || 'No contact selected'}
                          </p>
                          {role.name && (
                            <div className="text-xs text-gray-600 space-y-1 mt-2">
                              {/* Show "Contact verified in Salesforce" if we have a Salesforce contact ID */}
                              {role.salesforce_contact_id && (
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>Contact verified in Salesforce</span>
                                </div>
                              )}
                              {role.email && (
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>Email: {role.email}</span>
                                </div>
                              )}
                              {role.contact_title && (
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>Title: {role.contact_title}</span>
                                </div>
                              )}
                              {/* Show "View in Salesforce" link if we have a Salesforce contact ID */}
                              {role.salesforce_contact_id && (
                                <a
                                  href={getSalesforceLink(role.salesforce_contact_id, 'Contact')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline flex items-center"
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
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowRoleContactSelection(index)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            Change Contact
                          </button>
                          {role.name && (
                            <button
                              type="button"
                              onClick={() => clearRoleContact(index)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                            >
                              Clear Contact
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Selection */}
                    {showRoleContactSelection === index && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold mb-3 text-blue-800">Select Contact</h5>
                        
                        <div className="space-y-2">
                          {isLoadingContacts ? (
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-xs text-yellow-800">Loading contacts...</p>
                            </div>
                          ) : availableContacts.length > 0 ? (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-gray-600">
                                  {availableContacts.length} contact{availableContacts.length !== 1 ? 's' : ''} available
                                </p>
                                <button
                                  onClick={refreshContacts}
                                  disabled={isLoadingContacts}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Refresh
                                </button>
                              </div>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {availableContacts.map((contact) => (
                                  <div
                                    key={contact.Id}
                                    className="p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleContactSelectedForRole(contact, index)}
                                  >
                                    <div className="font-medium text-sm text-gray-900">{contact.FirstName} {contact.LastName}</div>
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
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-xs text-yellow-800">
                                No contacts found. Please ensure contacts exist in Salesforce.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role Details - Right Side (60%) */}
              <div className="lg:col-span-3">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Role Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role (from Salesforce Contact Title)</label>
                    <input
                      type="text"
                      value={role.role || role.contact_title || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-600"
                      placeholder="Role will be populated from selected contact's title"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Role is automatically set from the selected contact&apos;s Salesforce title
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
                    <textarea
                      value={role.responsibilities}
                      onChange={(e) => {
                        const newRoles = [...(formData.roles?.client_roles || [])];
                        newRoles[index] = { ...role, responsibilities: e.target.value };
                        setFormData({
                          ...formData,
                          roles: { ...formData.roles!, client_roles: newRoles }
                        });
                      }}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Describe the responsibilities for this role..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const newRoles = formData.roles?.client_roles.filter((_, i) => i !== index) || [];
                        setFormData({
                          ...formData,
                          roles: { ...formData.roles!, client_roles: newRoles }
                        });
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Role
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newRoles = [...(formData.roles?.client_roles || []), {
              role: '',
              name: '',
              email: '',
              responsibilities: ''
            }];
            setFormData({
              ...formData,
              roles: { ...formData.roles!, client_roles: newRoles }
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Client Role
        </button>
      </div>

      {/* Loading Modals */}
      <LoadingModal 
        isOpen={isSavingContact} 
        operation="saving"
        message="Saving contact selection to the database..."
      />
      
      <LoadingModal 
        isOpen={isClearingContact} 
        operation="updating"
        message="Clearing contact information..."
      />
      
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