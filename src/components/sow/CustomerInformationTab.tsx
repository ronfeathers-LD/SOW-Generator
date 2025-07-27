import React from 'react';
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
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Information</h2>
      
      {/* Enhanced Confirmation Checklist */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Required Information Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Account Check */}
          <div className="flex items-start p-4 rounded-md border">
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
                  >
                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    View in Salesforce
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Signer (Contact) Check */}
          <div className="flex items-start p-4 rounded-md border">
            <div className="flex-shrink-0 mr-3 mt-1">
              {selectedContact || formData.template?.customerSignatureName ? (
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
                  : formData.template?.customerSignatureName 
                    ? `${formData.template.customerSignatureName} (manual entry)`
                    : 'No signer selected'
                }
              </p>
              {(selectedContact || formData.template?.customerSignatureName) && (
                <div className="text-xs text-gray-600 space-y-1">
                  {selectedContact && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Contact verified in Salesforce</span>
                    </div>
                  )}
                  {formData.template?.customerEmail && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Email: {formData.template.customerEmail}</span>
                    </div>
                  )}
                  {formData.template?.customerSignature && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Title: {formData.template.customerSignature}</span>
                    </div>
                  )}
                  {selectedContact && (
                    <a
                      href={getSalesforceLink(selectedContact.Id, 'Contact')}
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
          </div>

          {/* Opportunity Check */}
          <div className="flex items-start p-4 rounded-md border">
            <div className="flex-shrink-0 mr-3 mt-1">
              {(selectedOpportunity || (initialData && (initialData.opportunityId || initialData.template?.opportunityId))) ? (
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
                  : (initialData?.opportunityName || initialData?.template?.opportunityName)
                    ? `${initialData.opportunityName || initialData.template?.opportunityName} (stored)`
                    : 'No opportunity selected'
                }
              </p>
              {(selectedOpportunity || (initialData && (initialData.opportunityId || initialData.template?.opportunityId))) && (
                <div className="text-xs text-gray-600 space-y-1">
                  {selectedOpportunity && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Opportunity verified in Salesforce</span>
                    </div>
                  )}
                  {(selectedOpportunity?.StageName || initialData?.opportunityStage || initialData?.template?.opportunityStage) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Stage: {selectedOpportunity?.StageName || initialData?.opportunityStage || initialData?.template?.opportunityStage}</span>
                    </div>
                  )}
                  {(selectedOpportunity?.Amount || initialData?.opportunityAmount || initialData?.template?.opportunityAmount) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Amount: {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(selectedOpportunity?.Amount || initialData?.opportunityAmount || initialData?.template?.opportunityAmount || 0)}</span>
                    </div>
                  )}
                  {(selectedOpportunity?.CloseDate || initialData?.opportunityCloseDate || initialData?.template?.opportunityCloseDate) && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Close Date: {new Date(selectedOpportunity?.CloseDate || initialData?.opportunityCloseDate || initialData?.template?.opportunityCloseDate || '').toLocaleDateString()}</span>
                    </div>
                  )}
                  {(selectedOpportunity || initialData?.opportunityId || initialData?.template?.opportunityId) && (
                    <a
                      href={getSalesforceLink(selectedOpportunity?.Id || initialData?.opportunityId || initialData?.template?.opportunityId || '', 'Opportunity')}
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
          </div>
        </div>
      </div>

      {/* Company Logo Upload */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Company Logo</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Company Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={onLogoChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {/* Logo Preview */}
          {(formData.template?.companyLogo || formData.header?.companyLogo) && (
            <div className="mt-3">
              <img
                src={formData.template?.companyLogo || formData.header?.companyLogo}
                alt="Company Logo"
                className="max-h-20 max-w-full object-contain border border-gray-200 rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Account Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">1. Select Account</h3>
        <SalesforceIntegration 
          onCustomerSelected={onCustomerSelectedFromSalesforce}
          onContactSelected={onContactSelectedFromSalesforce}
        />
      </div>

      {/* POC and Opportunity Selection - 50/50 Layout */}
      {selectedAccount && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">2. Select POC and Opportunity</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* POC Selection */}
            <div>
              <h4 className="text-md font-semibold mb-3 text-gray-800">Point of Contact</h4>
              {selectedContact ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-green-800">Selected POC</h5>
                      <div className="text-sm text-green-700 mt-1">
                        <div><strong>Name:</strong> {selectedContact.FirstName} {selectedContact.LastName}</div>
                        {selectedContact.Title && <div><strong>Title:</strong> {selectedContact.Title}</div>}
                        {selectedContact.Email && <div><strong>Email:</strong> {selectedContact.Email}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => onContactSelectedFromSalesforce(null)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    No POC selected. Please select a contact from the account selection above.
                  </p>
                  <p className="text-xs text-yellow-700">
                    After selecting an account in step 1, you can choose a contact from the "Select Point of Contact (POC)" section that appears in the account details.
                  </p>
                </div>
              )}
            </div>

            {/* Opportunity Selection */}
            <div>
              <h4 className="text-md font-semibold mb-3 text-gray-800">Opportunity</h4>
              {selectedOpportunity ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-blue-800">Selected Opportunity</h5>
                      <div className="text-sm text-blue-700 mt-1">
                        <div><strong>Name:</strong> {selectedOpportunity.Name}</div>
                        <div><strong>Stage:</strong> {selectedOpportunity.StageName}</div>
                        {selectedOpportunity.Amount && (
                          <div><strong>Amount:</strong> ${selectedOpportunity.Amount.toLocaleString()}</div>
                        )}
                        {selectedOpportunity.CloseDate && (
                          <div><strong>Close Date:</strong> {new Date(selectedOpportunity.CloseDate).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpportunitySelectedFromSalesforce(null as any)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : availableOpportunities.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableOpportunities.map((opportunity) => (
                    <div
                      key={opportunity.Id}
                      className="p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onOpportunitySelectedFromSalesforce(opportunity)}
                    >
                      <div className="font-medium text-gray-900 text-sm">{opportunity.Name}</div>
                      <div className="text-xs text-gray-600">
                        <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-1">
                          {opportunity.StageName}
                        </span>
                        {opportunity.Amount && (
                          <span className="text-gray-600">
                            ${opportunity.Amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {opportunity.CloseDate && (
                        <div className="text-xs text-gray-600">
                          Close: {new Date(opportunity.CloseDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No opportunities found for this account. You may need to create opportunities in Salesforce.
                  </p>
                </div>
              )}
            </div>
          </div>
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