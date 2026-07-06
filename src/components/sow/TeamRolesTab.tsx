import React, { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { Select, Textarea, Input, Button, EmptyState, SectionHeader } from '@/components/ui/form';
import { SalesforceAccount, SalesforceContact } from '@/lib/salesforce';
import { filterContacts } from '@/lib/utils/filter-contacts';
import { mergeStandardClientRoles } from '@/lib/sow/standard-client-roles';

interface TeamRolesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  leanDataSignatories: Array<{ id: string; name: string; email: string; title: string }>;
  selectedLeanDataSignatory: string;
  onLeanDataSignatoryChange: (signatoryId: string) => Promise<void>;
  // New props for signer selection
  selectedAccount: SalesforceAccount | null;
  selectedContact: SalesforceContact | null;
  getSalesforceLink: (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => string;
  onContactChange?: (contact: SalesforceContact | null) => void;
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
  onContactChange,
}: TeamRolesTabProps) {

  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showContactSelectionModal, setShowContactSelectionModal] = useState<{
    isOpen: boolean;
    type: 'signer' | 'secondSigner' | 'role';
    roleIndex?: number;
  }>({ isOpen: false, type: 'signer' });
  const [contactSearch, setContactSearch] = useState('');
  const [showSecondSignerSection, setShowSecondSignerSection] = useState<boolean>(false);

  // Load contacts when account is selected and set initial contact selection state
  useEffect(() => {
    if (selectedAccount?.Id) {
      loadContacts(selectedAccount.Id);
    }
  }, [selectedAccount?.Id]); // Only depend on account ID

  // Auto-show second signer section if there's already a second signer
  useEffect(() => {
    if (formData.template?.customer_signature_name_2) {
      setShowSecondSignerSection(true);
    }
  }, [formData.template?.customer_signature_name_2]);

  // Allow dismissing the contact-selection modal with the Escape key.
  useEffect(() => {
    if (!showContactSelectionModal.isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowContactSelectionModal({ isOpen: false, type: 'signer' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showContactSelectionModal.isOpen]);

  // Reset the contact search box whenever the modal opens or closes, so a
  // stale query from a previous session doesn't hide contacts next time.
  useEffect(() => {
    setContactSearch('');
  }, [showContactSelectionModal.isOpen]);

  const loadContacts = async (accountId: string) => {
    setIsLoadingContacts(true);
    try {
      const doFetch = async () => fetch('/api/salesforce/account-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
        }),
      });

      // First attempt
      let response = await doFetch();
      if (!response.ok && response.status >= 500) {
        // brief backoff then retry once
        await new Promise((r) => setTimeout(r, 300));
        response = await doFetch();
      }

      if (response.ok) {
        const data = await response.json();
        setAvailableContacts(data.contacts || []);
      } else {
        const errorData = await response.json().catch(() => ({ 
          error: 'Failed to load contacts',
          details: `HTTP ${response.status}: ${response.statusText}`
        }));
        console.error('Error loading contacts:', errorData.error, errorData.details);
        setAvailableContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Set empty array on error to prevent UI issues
      setAvailableContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const refreshContacts = async () => {
    if (!selectedAccount?.id) return;
    await loadContacts(selectedAccount.id);
  };

  // All mutations below go through `setFormData` only, which the parent wires
  // to `updateFormData` — that marks the form dirty and the global autosave
  // loop in SOWForm persists it, so nothing here needs its own PUT.

  const handleContactSelected = (contact: SalesforceContact) => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        customer_signature_name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
        customer_email: contact.Email || '',
        customer_signature: contact.Title || '',
      }
    });
    setShowContactSelectionModal({ isOpen: false, type: 'signer' });
  };

  const handleSecondSignerContactSelected = (contact: SalesforceContact) => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        customer_signature_name_2: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
        customer_email_2: contact.Email || '',
        customer_signature_2: contact.Title || '',
      }
    });
    setShowContactSelectionModal({ isOpen: false, type: 'signer' });
  };

  const handleContactSelectedForRole = (contact: SalesforceContact, roleIndex: number) => {
    const newRoles = [...(formData.roles?.client_roles || [])];
    newRoles[roleIndex] = {
      ...newRoles[roleIndex],
      name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
      email: contact.Email || '',
      salesforce_contact_id: contact.Id,
      contact_title: contact.Title,
      // Note: role.role is the role NAME (e.g. "Executive Sponsor") and must
      // never be overwritten by the contact's Salesforce title — that goes
      // in contact_title, shown separately as "Title: ..." in the card.
    };
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: newRoles }
    });
    setShowContactSelectionModal({ isOpen: false, type: 'signer' });

    // Update parent component's selected contact state
    if (onContactChange) {
      onContactChange(contact);
    }
  };

  // Clear primary signer function
  const clearPrimarySigner = () => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        customer_signature: '',
        customer_email: '',
        customer_signature_name: ''
      },
      salesforce_contact_id: undefined
    });
  };

  // Clear secondary signer function
  const clearSecondarySigner = () => {
    setFormData({
      ...formData,
      template: {
        ...formData.template!,
        customer_signature_name_2: '',
        customer_email_2: '',
        customer_signature_2: ''
      }
    });
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
      // role.role (the role NAME, e.g. "Executive Sponsor") is left as-is —
      // clearing the assigned contact should not blank the role slot itself.
    };
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: newRoles }
    });
  };

  // Client roles as they stand today, plus whichever of the five standard
  // slots (Task 2's mergeStandardClientRoles) aren't already present. Reference
  // equality with `clientRoles` means "nothing to add" — used to hide the
  // "Add standard roles" button once all five slots exist.
  const clientRoles = formData.roles?.client_roles || [];
  const mergedClientRoles = mergeStandardClientRoles(clientRoles);
  const hasAllStandardRoles = mergedClientRoles === clientRoles;

  const handleAddStandardRoles = () => {
    if (hasAllStandardRoles) return;
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: mergedClientRoles }
    });
  };

  // Contacts shown in the contact-selection modal, filtered by the search box.
  // SalesforceContact has no `Name` field (just FirstName/LastName), so
  // synthesize one for filterContacts to match against.
  const filteredContacts = filterContacts(
    availableContacts.map((contact) => ({
      ...contact,
      Name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
    })),
    contactSearch
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Signers & Client Roles"
        description="Choose the signers and define the client team's roles"
      />

      {/* Signatories Section - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Client Signer */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Client Signer</h3>
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
                  <div>
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
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowContactSelectionModal({ isOpen: true, type: 'signer' })}
                      className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      {formData.template?.customer_signature_name ? 'Change Signer' : 'Select Signer'}
                    </button>
                    {formData.template?.customer_signature_name && (
                      <button
                        type="button"
                        onClick={clearPrimarySigner}
                        className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Clear Signer
                      </button>
                    )}
                  </div>
                </div>

                {/* Unified Contact Selection Modal */}
                {showContactSelectionModal.isOpen && selectedAccount && (
                  <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
                    onClick={() => setShowContactSelectionModal({ isOpen: false, type: 'signer' })}
                  >
                    <div
                      className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mt-3">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {showContactSelectionModal.type === 'signer' && 'Select Customer Signer'}
                            {showContactSelectionModal.type === 'secondSigner' && 'Select Second Customer Signer'}
                            {showContactSelectionModal.type === 'role' && 'Select Contact for Role'}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowContactSelectionModal({ isOpen: false, type: 'signer' })}
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
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search by name, email, or title…"
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                              />
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-600">
                                  Showing {filteredContacts.length} of {availableContacts.length} contact{availableContacts.length !== 1 ? 's' : ''} for {selectedAccount.Name || selectedAccount.name}
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
                              {filteredContacts.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {filteredContacts.map((contact) => (
                                    <div
                                      key={contact.Id}
                                      className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                      onClick={() => {
                                        if (showContactSelectionModal.type === 'signer') {
                                          handleContactSelected(contact);
                                        } else if (showContactSelectionModal.type === 'secondSigner') {
                                          handleSecondSignerContactSelected(contact);
                                        } else if (showContactSelectionModal.type === 'role' && showContactSelectionModal.roleIndex !== undefined) {
                                          handleContactSelectedForRole(contact, showContactSelectionModal.roleIndex);
                                        }
                                        setShowContactSelectionModal({ isOpen: false, type: 'signer' });
                                      }}
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
                              ) : (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <p className="text-sm text-yellow-800">
                                    No contacts match your search.
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm text-yellow-800">
                                No contacts found for {selectedAccount.Name || selectedAccount.name}. Please ensure contacts exist in Salesforce.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end mt-6">
                          <button
                            type="button"
                            onClick={() => setShowContactSelectionModal({ isOpen: false, type: 'signer' })}
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

        {/* Column 2: Secondary Signer */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Secondary Signer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Optional - Select a second customer contact who will sign this SOW
            </p>
            
            {!selectedAccount ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  Please select a customer account first in the Customer Information tab.
                </p>
              </div>
            ) : !showSecondSignerSection ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-4">
                  Click the button below to add a second customer signer
                </p>
                <button
                  type="button"
                  onClick={() => setShowSecondSignerSection(true)}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Add Second Signer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Second Signer Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div>
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
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowContactSelectionModal({ isOpen: true, type: 'secondSigner' })}
                      className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      {formData.template?.customer_signature_name_2 ? 'Change Signer' : 'Select Signer'}
                    </button>
                    {formData.template?.customer_signature_name_2 && (
                      <button
                        type="button"
                        onClick={clearSecondarySigner}
                        className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Clear Signer
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}
            

          </div>


        </div>

        {/* Column 3: LeanData Signer */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-800">LeanData Signer</h3>
             <p className="text-sm text-gray-600 mb-4">
               Select the LeanData representative who will sign this SOW
             </p>
             <div className="relative">
               <Select
                 value={selectedLeanDataSignatory}
                 onChange={(e) => {
                   void onLeanDataSignatoryChange(e.target.value);
                 }}
                 error={!selectedLeanDataSignatory || formData.template?.lean_data_name?.trim() === 'None Selected'}
                 className="mt-1"
               >
                 <option value="">Select a signatory</option>
                 {leanDataSignatories.map((signatory) => (
                   <option key={signatory.id} value={signatory.id}>
                     {signatory.name} - {signatory.title}
                   </option>
                 ))}
               </Select>
                            </div>

               {/* Validation Error Message */}
               {(!selectedLeanDataSignatory ||
                 (formData.template?.lean_data_name && formData.template.lean_data_name.trim() === 'None Selected')) && (
                 <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-2">
                   <div className="flex items-center">
                     <svg className="h-4 w-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                     <span className="text-sm text-red-800">LeanData Signatory is required</span>
                   </div>
                 </div>
               )}

             {selectedLeanDataSignatory && (
               <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                 <div className="font-medium text-gray-900">
                   {leanDataSignatories.find(s => s.id === selectedLeanDataSignatory)?.name}
                 </div>
                 <div className="text-sm text-gray-600">
                   {leanDataSignatories.find(s => s.id === selectedLeanDataSignatory)?.title}
                 </div>
               </div>
             )}
           </div>

           
       </div>
     </div>
     
           {/* Client Roles */}
     <div className="bg-white shadow rounded-lg p-6">
       <div className="flex items-start justify-between gap-4 mb-4">
         <div>
           <h3 className="text-lg font-semibold">Client Roles & Responsibilities</h3>
           <p className="text-sm text-gray-600">
             Define the roles and responsibilities for the client team
           </p>
           <p className="text-xs text-gray-500 mt-1">
             Standard roles are pre-filled as a starting point — edit, remove, or add roles to match the engagement.
           </p>
         </div>
         {!hasAllStandardRoles && (
           <Button type="button" variant="secondary" onClick={handleAddStandardRoles}>
             Add standard roles
           </Button>
         )}
       </div>
        {(formData.roles?.client_roles?.length ?? 0) === 0 && (
          <EmptyState
            className="mb-4"
            title="No client roles yet"
            description="Add the customer contacts and their responsibilities for this engagement."
          />
        )}
        {formData.roles?.client_roles?.map((role, index) => (
          <div key={`client-role-${index}-${role.role || 'role'}-${role.email || 'no-email'}`} className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="mb-4">
              <label htmlFor={`client-role-name-${index}`} className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <Input
                id={`client-role-name-${index}`}
                value={role.role}
                onChange={(e) => {
                  const newRoles = [...(formData.roles?.client_roles || [])];
                  newRoles[index] = { ...role, role: e.target.value };
                  setFormData({
                    ...formData,
                    roles: { ...formData.roles!, client_roles: newRoles }
                  });
                }}
                placeholder="e.g. Executive Sponsor"
                className="mt-1 text-base font-semibold text-gray-900"
              />
            </div>
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
                            onClick={() => setShowContactSelectionModal({ isOpen: true, type: 'role', roleIndex: index })}
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

                  </div>
                )}
              </div>

              {/* Role Details - Right Side (60%) */}
              <div className="lg:col-span-3">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Role Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
                    <div className="relative">
                      <Textarea
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
                        className="mt-1"
                        placeholder="Describe the responsibilities for this role..."
                      />
                    </div>
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
        <Button
          type="button"
          variant="secondary"
          leftIcon={
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          }
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
        >
          Add Client Role
        </Button>
      </div>
    </section>
  );
}