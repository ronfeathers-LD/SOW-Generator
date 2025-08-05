import React, { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceContact } from '@/lib/salesforce';
import SalesforceIntegration from '../SalesforceIntegration';

interface TeamRolesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  leanDataSignatories: Array<{ id: string; name: string; email: string; title: string }>;
  selectedLeanDataSignatory: string;
  onLeanDataSignatoryChange: (signatoryId: string) => void;
  // New props for signer selection
  selectedAccount: { id: string; name: string } | null;
  selectedContact: SalesforceContact | null;
  onContactSelectedFromSalesforce: (contact: SalesforceContact | null) => void;
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
  onContactSelectedFromSalesforce,
  getSalesforceLink,
}: TeamRolesTabProps) {
  console.log('🔍 TeamRolesTab received props:', {
    selectedContact,
    formDataTemplate: formData.template,
    selectedAccount
  });
  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showContactSelection, setShowContactSelection] = useState<number | null>(null);

  // Load contacts when account is selected and set initial contact selection state
  useEffect(() => {
    if (selectedAccount?.id) {
      loadContacts(selectedAccount.id);
      
      // Show contact selection if no contact is currently selected
      // Check both selectedContact and formData for contact information
      const hasContactInfo = selectedContact || 
                           formData.template?.customer_signature_name || 
                           formData.salesforce_contact_id;
      
      const shouldShowSelection = !hasContactInfo;
      setShowContactSelection(shouldShowSelection ? 0 : null);
    }
  }, [selectedAccount?.id, selectedContact, formData.template?.customer_signature_name, formData.salesforce_contact_id]);

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

  const handleContactSelected = (contact: SalesforceContact | null) => {
    onContactSelectedFromSalesforce(contact);
    if (contact) {
      setShowContactSelection(null);
    }
  };

  const handleContactSelectedForRole = (contact: SalesforceContact, roleIndex: number) => {
    const newRoles = [...(formData.roles?.client_roles || [])];
    newRoles[roleIndex] = { 
      ...newRoles[roleIndex], 
      name: `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
      email: contact.Email || ''
    };
    setFormData({
      ...formData,
      roles: { ...formData.roles!, client_roles: newRoles }
    });
    setShowContactSelection(null);
  };

  const handleAccountSelected = (customerData: { account: any; contacts: any[]; opportunities: any[] }) => {
    setAvailableContacts(customerData.contacts || []);
    // Only show contact selection if no contact is currently selected
    setShowContactSelection(!selectedContact ? 0 : null);
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Team & Roles</h2>
      
      {/* Signatories Section - 50/50 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Signer - Left Side */}
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
                      {(() => {
                        // Determine the contact name to display
                        let contactDisplay = 'No signer selected';
                        
                        if (selectedContact?.FirstName || selectedContact?.LastName) {
                          contactDisplay = `${selectedContact.FirstName || ''} ${selectedContact.LastName}`.trim();
                        } else if (formData.template?.customer_signature_name) {
                          contactDisplay = formData.template.customer_signature_name;
                        }
                        
                        return contactDisplay;
                      })()}
                    </p>
                    {(selectedContact || formData.template?.customer_signature_name || formData.salesforce_contact_id) && (
                      <div className="text-xs text-gray-600 space-y-1 mt-2">
                        {/* Show "Contact verified in Salesforce" if we have a Salesforce contact ID */}
                        {(selectedContact?.Id || formData.salesforce_contact_id) && (
                          <div className="flex items-center">
                            <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Contact verified in Salesforce</span>
                          </div>
                        )}
                        {(selectedContact?.Email || formData.template?.customer_email) && (
                          <div className="flex items-center">
                            <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Email: {selectedContact?.Email || formData.template?.customer_email}</span>
                          </div>
                        )}
                        {(selectedContact?.Title || formData.template?.customer_signature) && (
                          <div className="flex items-center">
                            <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Title: {selectedContact?.Title || formData.template?.customer_signature}</span>
                          </div>
                        )}
                        {/* Show "View in Salesforce" link if we have a Salesforce contact ID */}
                        {(selectedContact?.Id || formData.salesforce_contact_id) && (
                          <a
                            href={getSalesforceLink(selectedContact?.Id || formData.salesforce_contact_id || '', 'Contact')}
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
                                          <button
                          onClick={() => setShowContactSelection(0)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                    Change Signer
                  </button>
                </div>
              </div>

              {/* Contact Selection */}
              {showContactSelection && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4 text-blue-800">Select Customer Signer</h4>
                  
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
                        <div className="space-y-2 max-h-60 overflow-y-auto">
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* LeanData Signatory - Right Side */}
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
      </div>
      
      {/* Client Roles */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Client Roles & Responsibilities</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define the roles and responsibilities for the client team
        </p>
        {formData.roles?.client_roles?.map((role, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact Selection - Left Side (30%) */}
              <div className="lg:col-span-1">
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
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">Current Contact</h5>
                          <p className="text-sm text-gray-600">
                            {role.name || 'No contact selected'}
                          </p>
                          {role.email && (
                            <p className="text-xs text-gray-500">{role.email}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setShowContactSelection(index)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Contact Selection */}
                    {showContactSelection === index && (
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

              {/* Role Details - Right Side (70%) */}
              <div className="lg:col-span-2">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Role Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <input
                      type="text"
                      value={role.role}
                      onChange={(e) => {
                        const newRoles = [...(formData.roles?.client_roles || [])];
                        newRoles[index] = { ...role, role: e.target.value };
                        setFormData({
                          ...formData,
                          roles: { ...formData.roles!, client_roles: newRoles }
                        });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g., Project Manager"
                    />
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


    </section>
  );
} 