'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  name: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  industry?: string;
  numberOfEmployees?: number;
}

interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  closeDate?: string;
  stageName: string;
  description?: string;
}

interface CustomerSelectionWizardProps {
  onComplete: (selectedAccount: Account, selectedOpportunity: Opportunity) => void;
}

export default function CustomerSelectionWizard({ onComplete }: CustomerSelectionWizardProps) {
  const [step, setStep] = useState<'search' | 'select' | 'opportunity'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [error, setError] = useState<string | null>(null);



  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
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
          searchTerm: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
      
      if (data.accounts && data.accounts.length > 0) {
        setStep('select');
      } else {
        setError('No accounts found in Salesforce. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching accounts:', error);
      setError('Failed to search accounts. Please try again or contact support if the issue persists.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleAccountNext = async () => {
    if (!selectedAccount) {
      setError('Please select an account to continue');
      return;
    }
    setStep('opportunity');
    await loadOpportunities(selectedAccount.id);
  };

  const loadOpportunities = async (accountId: string) => {
    setIsLoadingOpportunities(true);
    setError(null);

    try {
      const response = await fetch('/api/salesforce/account-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities || []);
      
      if (!data.opportunities || data.opportunities.length === 0) {
        setError('No opportunities found for this account. An opportunity is required to create a SOW. Please ensure the account has opportunities in Salesforce.');
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setError('Failed to load opportunities. An opportunity is required to create a SOW. Please try again or contact support if the issue persists.');
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  const handleOpportunitySelect = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
  };

  const handleOpportunityNext = () => {
    if (!selectedOpportunity) {
      setError('Please select an opportunity to continue');
      return;
    }
    onComplete(selectedAccount!, selectedOpportunity);
  };


  const handleBackToSearch = () => {
    setStep('search');
    setSelectedAccount(null);
    setSelectedOpportunity(null);
    setAccounts([]);
    setOpportunities([]);
    setError(null);
  };

  const handleBackToAccountSelection = () => {
    setStep('select');
    setSelectedOpportunity(null);
    setOpportunities([]);
    setError(null);
  };


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Create New Statement of Work</h1>
            <p className="mt-1 text-sm text-gray-600">
              Step 1: Select an existing customer account from Salesforce
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'search' || step === 'select' || step === 'opportunity' 
                    ? 'bg-indigo-600' 
                    : 'bg-gray-300'
                }`}>
                  <span className={`text-sm font-medium ${
                    step === 'search' || step === 'select' || step === 'opportunity' 
                      ? 'text-white' 
                      : 'text-gray-500'
                  }`}>1</span>
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step === 'search' || step === 'select' || step === 'opportunity' 
                    ? 'text-indigo-600' 
                    : 'text-gray-500'
                }`}>Customer Selection</span>
              </div>
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'opportunity' 
                    ? 'bg-indigo-600' 
                    : 'bg-gray-300'
                }`}>
                  <span className={`text-sm font-medium ${
                    step === 'opportunity' 
                      ? 'text-white' 
                      : 'text-gray-500'
                  }`}>2</span>
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step === 'opportunity' 
                    ? 'text-indigo-600' 
                    : 'text-gray-500'
                }`}>Opportunity Selection</span>
              </div>
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-sm font-medium">3</span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">SOW Creation</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {step === 'search' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Search for Customer</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Search for an existing customer account in Salesforce to create a Statement of Work.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Only existing accounts in Salesforce can be used to create SOWs. 
                      If you cannot find the customer, please ensure the account exists in Salesforce first.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                      Search Customer Name
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter customer name to search..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>


                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Select Customer Account</h2>
                  <button
                    onClick={handleBackToSearch}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    ← Back to search
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Found {accounts.length} account(s) matching "{searchQuery}". Select the correct customer:
                </p>

                <div className="space-y-3">
                  {accounts.map((account, index) => (
                    <div
                      key={account.id || `account-${index}`}
                      onClick={() => handleAccountSelect(account)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAccount?.id === account.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{account.name}</h3>
                          <div className="mt-1 text-sm text-gray-500 space-x-4">
                            {[
                              account.billingCity && (
                                <span key="city">{account.billingCity}, {account.billingState}</span>
                              ),
                              account.industry && (
                                <span key="industry">{account.industry}</span>
                              ),
                              account.numberOfEmployees && (
                                <span key="employees">{account.numberOfEmployees} employees</span>
                              )
                            ].filter(Boolean)}
                          </div>
                        </div>
                        <div className="text-indigo-600">
                          {selectedAccount?.id === account.id ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleBackToSearch}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Back to Search
                  </button>
                  <button
                    onClick={handleAccountNext}
                    disabled={!selectedAccount}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

              </div>
            )}

            {step === 'opportunity' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Select Opportunity</h2>
                  <button
                    onClick={handleBackToAccountSelection}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    ← Back to customer selection
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Found {opportunities.length} opportunity(ies) for "{selectedAccount?.name}". Select the correct opportunity:
                </p>

                {isLoadingOpportunities ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-gray-600">Loading opportunities...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opportunity, index) => (
                      <div
                        key={opportunity.id || `opportunity-${index}`}
                        onClick={() => handleOpportunitySelect(opportunity)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedOpportunity?.id === opportunity.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{opportunity.name}</h3>
                            <div className="mt-1 text-sm text-gray-500 space-x-4">
                              {[
                                opportunity.amount && (
                                  <span key="amount">${opportunity.amount.toLocaleString()}</span>
                                ),
                                opportunity.closeDate && (
                                  <span key="closeDate">Close: {new Date(opportunity.closeDate).toLocaleDateString()}</span>
                                ),
                                opportunity.stageName && (
                                  <span key="stageName" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {opportunity.stageName}
                                  </span>
                                )
                              ].filter(Boolean)}
                            </div>
                            {opportunity.description && (
                              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{opportunity.description}</p>
                            )}
                          </div>
                          <div className="text-indigo-600">
                            {selectedOpportunity?.id === opportunity.id ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleBackToAccountSelection}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Back to Customer Selection
                  </button>
                  <button
                    onClick={handleOpportunityNext}
                    disabled={!selectedOpportunity}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
} 