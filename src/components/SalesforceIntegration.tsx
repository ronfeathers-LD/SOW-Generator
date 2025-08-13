'use client';

import { useState, useEffect } from 'react';
import { SalesforceAccount, SalesforceContact, SalesforceOpportunity } from '@/lib/salesforce';

interface SalesforceIntegrationProps {
  onCustomerSelected: (customerData: {
    account: SalesforceAccount;
    opportunities: SalesforceOpportunity[];
  }) => void;
  onContactSelected?: (contact: SalesforceContact) => void;
  showOnlyAccountSelection?: boolean;
}

export default function SalesforceIntegration({ onCustomerSelected, onContactSelected, showOnlyAccountSelection = false }: SalesforceIntegrationProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<SalesforceAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SalesforceAccount | null>(null);
  const [contacts, setContacts] = useState<SalesforceContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<SalesforceContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    isConfigured: boolean;
    isActive: boolean;
    lastError?: string;
  } | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);

  // Check Salesforce configuration status on component mount
  useEffect(() => {
    // Add a small delay to ensure the server is ready
    const timer = setTimeout(() => {
      checkConfigStatus();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const checkConfigStatus = async () => {
    try {
      setIsCheckingConfig(true);
      console.log('🔍 Checking Salesforce configuration status...');
      const response = await fetch('/api/salesforce/status');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Salesforce status response:', data);
        setConfigStatus({
          isConfigured: data.isConfigured,
          isActive: data.isActive,
          lastError: data.lastError
        });
      } else {
        console.warn('⚠️ Salesforce status response not ok:', response.status, response.statusText);
        setConfigStatus({
          isConfigured: false,
          isActive: false
        });
      }
    } catch (error) {
      console.error('❌ Error checking Salesforce config status:', error);
      // Don't set error state for network failures - just log them
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('🌐 Network error - Salesforce API may not be available yet');
      }
      setConfigStatus({
        isConfigured: false,
        isActive: false
      });
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    if (!configStatus?.isConfigured || !configStatus?.isActive) {
      setError('Salesforce integration is not configured or inactive');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/salesforce/search-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search Salesforce');
      }

      const data = await response.json();
      setAccounts(data.accounts);
      
      if (data.accounts.length === 0) {
        setError('No accounts found matching your search term');
      }
    } catch (error) {
      console.error('Error searching Salesforce:', error);
      setError(error instanceof Error ? error.message : 'Failed to search Salesforce');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAccountSelect = async (account: SalesforceAccount) => {
    setSelectedAccount(account);
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/salesforce/customer-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: account.Id || account.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get customer information');
      }

      const data = await response.json();
      
      setContacts(data.customerInfo.contacts || []);
      
      // Pass the customer data to the parent component (only account and opportunities needed)
      onCustomerSelected({
        account: data.customerInfo.account,
        opportunities: data.customerInfo.opportunities || []
      });

      // Reset selected contact when account changes
      setSelectedContact(null);

    } catch (error) {
      console.error('Error getting customer info:', error);
      setError(error instanceof Error ? error.message : 'Failed to get customer information');
    } finally {
      setIsSearching(false);
    }
  };

  const formatAddress = (account: SalesforceAccount) => {
    // Handle both uppercase and lowercase property names from Salesforce API
    const parts = [
      account.BillingStreet || account.billingStreet,
      account.BillingCity || account.billingCity,
      account.BillingState || account.billingState,
      account.BillingPostalCode || account.billingPostalCode,
      account.BillingCountry || account.billingCountry
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'No address available';
  };

  const handleContactSelect = (contact: SalesforceContact) => {
    setSelectedContact(contact);
    if (onContactSelected) {
      onContactSelected(contact);
    }
  };

  // Show loading state
  if (isCheckingConfig) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">Salesforce Integration</h3>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-blue-700">Checking Salesforce configuration...</p>
        </div>
      </div>
    );
  }

  // Show configuration status
  if (!configStatus?.isConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">Salesforce Integration</h3>
        <p className="text-yellow-700 mb-4">
          Salesforce integration is not configured. Please contact your administrator to set up the connection.
        </p>
        <div className="flex gap-2">
          <a
            href="/admin/salesforce"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            Configure Salesforce
          </a>
          <button
            onClick={checkConfigStatus}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Retry Check
          </button>
        </div>
      </div>
    );
  }

  if (!configStatus?.isActive) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-red-800">Salesforce Integration</h3>
        <p className="text-red-700 mb-4">
          Salesforce integration is currently disabled. Please contact your administrator to enable it.
        </p>
        {configStatus.lastError && (
          <p className="text-sm text-red-600 mb-4">
            Last error: {configStatus.lastError}
          </p>
        )}
        <div className="flex gap-2">
          <a
            href="/admin/salesforce"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Fix Configuration
          </a>
          <button
            onClick={checkConfigStatus}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-600 mb-4">
        Search for customers in Salesforce and automatically populate the form with their information.
      </p>

      {/* Search */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search for customer by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {accounts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {accounts.map((account) => (
              <div
                key={account.Id || account.id}
                className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleAccountSelect(account)}
              >
                {/* Company Name - Primary */}
                <div className="font-semibold text-gray-900 text-base mb-2">
                  {account.Name || account.name}
                </div>
                
                {/* Address Information */}
                <div className="text-sm text-gray-700 mb-2">
                  <div className="font-medium text-gray-800">Address:</div>
                  <div className="text-gray-600">{formatAddress(account)}</div>
                </div>
                
                {/* Company Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {account.Industry || account.industry ? (
                    <div key="industry">
                      <span className="font-medium text-gray-700">Industry:</span>
                      <span className="text-gray-600 ml-1">{account.Industry || account.industry}</span>
                    </div>
                  ) : null}
                  
                  {account.NumberOfEmployees || account.numberOfEmployees ? (
                    <div key="employees">
                      <span className="font-medium text-gray-700">Employees:</span>
                      <span className="text-gray-600 ml-1">{account.NumberOfEmployees || account.numberOfEmployees}</span>
                    </div>
                  ) : null}
                  
                  {account.Type ? (
                    <div key="type">
                      <span className="font-medium text-gray-700">Type:</span>
                      <span className="text-gray-600 ml-1">{account.Type}</span>
                    </div>
                  ) : null}
                  
                  {account.Phone ? (
                    <div key="phone">
                      <span className="font-medium text-gray-700">Phone:</span>
                      <span className="text-gray-600 ml-1">{account.Phone}</span>
                    </div>
                  ) : null}
                </div>
                
                {/* Click hint */}
                <div className="text-xs text-blue-600 mt-2 italic">
                  Click to select this company
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Customer Info */}
      {selectedAccount && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-800 mb-3">Selected Customer</h4>
          
          {/* Company Details */}
          <div className="space-y-2 mb-3">
            <div className="text-sm text-green-700" key="company-name">
              <span className="font-semibold">Company:</span> {selectedAccount.Name || selectedAccount.name}
            </div>
            
            {formatAddress(selectedAccount) !== 'No address available' && (
              <div className="text-sm text-green-700" key="address">
                <span className="font-semibold">Address:</span> {formatAddress(selectedAccount)}
              </div>
            )}
            
            {selectedAccount.Industry && (
              <div className="text-sm text-green-700" key="industry">
                <span className="font-semibold">Industry:</span> {selectedAccount.Industry}
              </div>
            )}
            
            {selectedAccount.NumberOfEmployees && (
              <div className="text-sm text-green-700" key="employees">
                <span className="font-semibold">Employees:</span> {selectedAccount.NumberOfEmployees}
              </div>
            )}
            
            {selectedAccount.Type && (
              <div className="text-sm text-green-700" key="type">
                <span className="font-semibold">Type:</span> {selectedAccount.Type}
              </div>
            )}
            
            {selectedAccount.Phone && (
              <div className="text-sm text-green-700" key="phone">
                <span className="font-semibold">Phone:</span> {selectedAccount.Phone}
              </div>
            )}
            
            <div className="text-sm text-green-700" key="contacts-count">
              <span className="font-semibold">Contacts Found:</span> {contacts.length}
            </div>
          </div>
          

          
          {/* POC Selection - Only show if not in account-only mode */}
          {!showOnlyAccountSelection && contacts.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-medium text-green-800 mb-2">Select Point of Contact (POC)</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.Id}
                    className={`p-2 border rounded-md cursor-pointer transition-colors ${
                      selectedContact?.Id === contact.Id
                        ? 'bg-green-100 border-green-400'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleContactSelect(contact)}
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {contact.FirstName} {contact.LastName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {contact.Title || 'No title'}
                    </div>
                    {contact.Email && (
                      <div className="text-xs text-gray-600 truncate">
                        {contact.Email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedContact && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Selected POC:</strong> {selectedContact.FirstName} {selectedContact.LastName}
                    {selectedContact.Title && ` - ${selectedContact.Title}`}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!showOnlyAccountSelection && contacts.length === 0 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm text-yellow-800">
                No contacts found for this account. You may need to add contacts in Salesforce.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 