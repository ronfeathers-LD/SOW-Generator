'use client';

import { useState, useEffect } from 'react';
import { SalesforceAccount, SalesforceContact, SalesforceOpportunity } from '@/lib/salesforce';

interface SalesforceIntegrationProps {
  onCustomerSelected: (customerData: {
    account: SalesforceAccount;
    contacts: SalesforceContact[];
    opportunities: SalesforceOpportunity[];
  }) => void;
  onContactSelected?: (contact: SalesforceContact) => void;
}

export default function SalesforceIntegration({ onCustomerSelected, onContactSelected }: SalesforceIntegrationProps) {
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

  // Check Salesforce configuration status on component mount
  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = async () => {
    try {
      const response = await fetch('/api/admin/salesforce/config');
      if (response.ok) {
        const data = await response.json();
        setConfigStatus({
          isConfigured: true,
          isActive: data.config.is_active, // Use snake_case field name
          lastError: data.config.last_error // Use snake_case field name
        });
      } else if (response.status === 404) {
        setConfigStatus({
          isConfigured: false,
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error checking config status:', error);
      setConfigStatus({
        isConfigured: false,
        isActive: false
      });
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
          accountId: account.Id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get customer information');
      }

      const data = await response.json();
      console.log('Customer info response:', data);
      console.log('Contacts found:', data.customerInfo.contacts?.length || 0);
      console.log('Opportunities found:', data.customerInfo.opportunities?.length || 0);
      
      setContacts(data.customerInfo.contacts || []);
      
      // Pass the customer data to the parent component
      onCustomerSelected({
        account: data.customerInfo.account,
        contacts: data.customerInfo.contacts || [],
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
    const parts = [
      account.BillingStreet,
      account.BillingCity,
      account.BillingState,
      account.BillingPostalCode,
      account.BillingCountry
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'No address available';
  };

  const handleContactSelect = (contact: SalesforceContact) => {
    setSelectedContact(contact);
    if (onContactSelected) {
      onContactSelected(contact);
    }
  };

  // Show configuration status
  if (!configStatus?.isConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">Salesforce Integration</h3>
        <p className="text-yellow-700 mb-4">
          Salesforce integration is not configured. Please contact your administrator to set up the connection.
        </p>
        <a
          href="/admin/salesforce"
          className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Configure Salesforce
        </a>
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
        <a
          href="/admin/salesforce"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Fix Configuration
        </a>
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
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {accounts.map((account) => (
              <div
                key={account.Id}
                className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAccountSelect(account)}
              >
                <div className="font-medium text-gray-900 text-sm">{account.Name}</div>
                <div className="text-xs text-gray-600 truncate">{formatAddress(account)}</div>
                {account.Industry && (
                  <div className="text-xs text-gray-600">Industry: {account.Industry}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Customer Info */}
      {selectedAccount && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-800 mb-2">Selected Customer</h4>
          <div className="text-sm text-green-700">
            <div><strong>Account:</strong> {selectedAccount.Name}</div>
            <div><strong>Contacts:</strong> {contacts.length} found</div>
          </div>
          
          {/* Debug info */}
          <div className="mt-2 text-xs text-gray-500">
            Debug: selectedAccount={!!selectedAccount}, contacts.length={contacts.length}
          </div>
          
          {/* POC Selection */}
          {contacts.length > 0 && (
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
          
          {contacts.length === 0 && (
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