import React, { useState } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceContact, SalesforceOpportunity } from '@/lib/salesforce';
import SalesforceIntegration from '../SalesforceIntegration';
import OpportunityLookup from '../OpportunityLookup';

interface CustomerInformationTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  initialData?: SOWData;
  selectedAccount: { id: string; name: string } | null;
  selectedContact: SalesforceContact | null;
  selectedOpportunity: SalesforceOpportunity | null;
  availableOpportunities: SalesforceOpportunity[];
  onCustomerSelectedFromSalesforce: (customerData: { account: any; contacts: any[]; opportunities: any[] }) => void;
  onContactSelectedFromSalesforce: (contact: SalesforceContact | null) => void;
  onOpportunitySelectedFromSalesforce: (opportunity: SalesforceOpportunity | null) => void;
  getSalesforceLink: (recordId: string, recordType: 'Account' | 'Contact' | 'Opportunity') => string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

type SelectionStep = 'account' | 'contact' | 'opportunity' | null;

export default function CustomerInformationTab({
  formData,
  setFormData,
  initialData,
  selectedAccount,
  selectedContact,
  selectedOpportunity,
  availableOpportunities,
  onCustomerSelectedFromSalesforce,
  onContactSelectedFromSalesforce,
  onOpportunitySelectedFromSalesforce,
  getSalesforceLink,
  onLogoChange,
}: CustomerInformationTabProps) {
  const [currentStep, setCurrentStep] = useState<SelectionStep>(null);
  const [availableContacts, setAvailableContacts] = useState<SalesforceContact[]>([]);

  // Determine which step to show based on current selections
  const getNextStep = (): SelectionStep => {
    if (!selectedAccount) return 'account';
    if (!selectedContact) return 'contact';
    if (!selectedOpportunity) return 'opportunity';
    return null;
  };

  const handleStepButtonClick = (step: SelectionStep) => {
    setCurrentStep(step);
  };

  const handleAccountSelected = (customerData: { account: any; contacts: any[]; opportunities: any[] }) => {
    onCustomerSelectedFromSalesforce(customerData);
    setAvailableContacts(customerData.contacts || []);
    setCurrentStep('contact');
  };

  const handleContactSelected = (contact: SalesforceContact | null) => {
    onContactSelectedFromSalesforce(contact);
    if (contact) {
      setCurrentStep('opportunity');
    }
  };

  const handleOpportunitySelected = (opportunity: SalesforceOpportunity | null) => {
    onOpportunitySelectedFromSalesforce(opportunity);
    if (opportunity) {
      setCurrentStep(null);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Information</h2>
      
      {/* Enhanced Confirmation Checklist */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Required Information Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {selectedAccount ? selectedAccount.name : 'No account selected'}
              </p>
              {selectedAccount && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Account verified in Salesforce</span>
                  </div>
                  <a
                    href={getSalesforceLink(selectedAccount.id, 'Account')}
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

          {/* Signer (Contact) Check */}
          <div 
            className={`flex items-start p-4 rounded-md border transition-colors ${
              currentStep === 'contact' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            } ${!selectedAccount ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => selectedAccount && handleStepButtonClick('contact')}
          >
            <div className="flex-shrink-0 mr-3 mt-1">
              {selectedContact || formData.template?.customer_signature_name ? (
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
              <p className="text-sm font-medium text-gray-900">Signer (Contact)</p>
              <p className="text-xs text-gray-500 mb-2">
                {selectedContact 
                  ? `${selectedContact.FirstName || ''} ${selectedContact.LastName}`.trim()
                                  : formData.template?.customer_signature_name
                ? `${formData.template.customer_signature_name} (manual entry)`
                    : 'No signer selected'
                }
              </p>
              {(selectedContact || formData.template?.customer_signature_name) && (
                <div className="text-xs text-gray-600 space-y-1">
                  {selectedContact && (
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
                  {selectedContact && (
                    <a
                      href={getSalesforceLink(selectedContact.Id, 'Contact')}
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
              {!selectedContact && selectedAccount && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-blue-600 font-medium">Click to select</p>
                </div>
              )}
              {!selectedAccount && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Select account first</p>
                </div>
              )}
            </div>
          </div>

          {/* Opportunity Check */}
          <div 
            className={`flex items-start p-4 rounded-md border transition-colors ${
              currentStep === 'opportunity' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            } ${!selectedAccount || !selectedContact ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => selectedAccount && selectedContact && handleStepButtonClick('opportunity')}
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
                  ? selectedOpportunity.Name
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
                                      {(selectedOpportunity?.StageName || initialData?.opportunity_stage || initialData?.template?.opportunity_stage) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                                              <span>Stage: {selectedOpportunity?.StageName || initialData?.opportunity_stage || initialData?.template?.opportunity_stage}</span>
                    </div>
                  )}
                                      {(selectedOpportunity?.Amount || initialData?.opportunity_amount || initialData?.template?.opportunity_amount) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Amount: {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                                              }).format(selectedOpportunity?.Amount || initialData?.opportunity_amount || initialData?.template?.opportunity_amount || 0)}</span>
                    </div>
                  )}
                                      {(selectedOpportunity?.CloseDate || initialData?.opportunity_close_date || initialData?.template?.opportunity_close_date) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                                              <span>Close Date: {new Date(selectedOpportunity?.CloseDate || initialData?.opportunity_close_date || initialData?.template?.opportunity_close_date || '').toLocaleDateString()}</span>
                    </div>
                  )}
                                      {(selectedOpportunity || initialData?.opportunity_id || initialData?.template?.opportunity_id) && (
                    <a
                                              href={getSalesforceLink(selectedOpportunity?.Id || initialData?.opportunity_id || initialData?.template?.opportunity_id || '', 'Opportunity')}
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
              {!selectedOpportunity && selectedAccount && selectedContact && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-blue-600 font-medium">Click to select</p>
                </div>
              )}
              {(!selectedAccount || !selectedContact) && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Select account & contact first</p>
                </div>
              )}
            </div>
          </div>

          {/* Company Logo Upload */}
          <div className="flex items-start p-4 rounded-md border">
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
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogoChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {/* Logo Preview */}
                {(formData.template?.company_logo || formData.header?.company_logo) && (
                  <div className="mt-2">
                    <img
                      src={formData.template?.company_logo || formData.header?.company_logo}
                      alt="Company Logo"
                      className="max-h-12 max-w-full object-contain border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection UI based on current step */}
      {currentStep === 'account' && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h4 className="text-md font-semibold mb-4 text-blue-800">Step 1: Select Account</h4>
          <SalesforceIntegration 
            onCustomerSelected={handleAccountSelected}
            onContactSelected={onContactSelectedFromSalesforce}
            showOnlyAccountSelection={true}
          />
        </div>
      )}

      {currentStep === 'contact' && selectedAccount && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h4 className="text-md font-semibold mb-4 text-blue-800">Step 2: Select Point of Contact</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Selected Account:</strong> {selectedAccount.name}
            </p>
            <p className="text-sm text-blue-700">
              Please select a contact from the list below.
            </p>
          </div>
          
          {/* Contact Selection */}
          <div className="space-y-4">
            {availableContacts.length > 0 ? (
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
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No contacts found for this account. You may need to add contacts in Salesforce.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 'opportunity' && selectedAccount && selectedContact && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h4 className="text-md font-semibold mb-4 text-blue-800">Step 3: Select Opportunity</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Selected Account:</strong> {selectedAccount.name}
            </p>
            <p className="text-sm text-blue-800 mb-2">
              <strong>Selected Contact:</strong> {selectedContact.FirstName} {selectedContact.LastName}
            </p>
          </div>
          
          {availableOpportunities.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableOpportunities.map((opportunity) => (
                <div
                  key={opportunity.Id}
                  className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleOpportunitySelected(opportunity)}
                >
                  <div className="font-medium text-gray-900">{opportunity.Name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-2">
                      {opportunity.StageName}
                    </span>
                    {opportunity.Amount && (
                      <span className="text-gray-600">
                        ${opportunity.Amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {opportunity.CloseDate && (
                    <div className="text-xs text-gray-600 mt-1">
                      Close Date: {new Date(opportunity.CloseDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                No opportunities found for this account. You may need to create opportunities in Salesforce.
              </p>
            </div>
          )}
        </div>
      )}

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