'use client';

import { useState, useEffect } from 'react';
import { SalesforceOpportunity } from '@/lib/salesforce';

interface OpportunityLookupProps {
  accountId?: string;
  accountName?: string;
  onOpportunitySelected?: (opportunity: SalesforceOpportunity) => void;
}

export default function OpportunityLookup({ 
  accountId, 
  accountName, 
  onOpportunitySelected 
}: OpportunityLookupProps) {
  const [opportunities, setOpportunities] = useState<SalesforceOpportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesforceOpportunity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load opportunities when accountId changes
  useEffect(() => {
    if (accountId) {
      loadOpportunities(accountId);
    } else {
      setOpportunities([]);
      setSelectedOpportunity(null);
    }
  }, [accountId]);

  const loadOpportunities = async (accountId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/salesforce/customer-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load opportunities');
      }

      const data = await response.json();
      setOpportunities(data.customerInfo.opportunities || []);
      
      if (data.customerInfo.opportunities?.length === 0) {
        setError('No opportunities found for this account');
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpportunitySelect = (opportunity: SalesforceOpportunity) => {
    setSelectedOpportunity(opportunity);
    if (onOpportunitySelected) {
      onOpportunitySelected(opportunity);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <p className="text-gray-600 mb-4">
        Select an opportunity for account: <strong>{accountName}</strong>
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-blue-700">Loading opportunities...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

            {/* Opportunities List */}
      {opportunities.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {opportunities.map((opportunity) => (
            <div
              key={opportunity.Id}
              className={`p-2 border rounded-md cursor-pointer transition-colors ${
                selectedOpportunity?.Id === opportunity.Id
                  ? 'bg-blue-100 border-blue-400'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleOpportunitySelect(opportunity)}
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{opportunity.Name}</div>
                <div className="text-xs text-gray-600">
                  <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-1">
                    {opportunity.StageName}
                  </span>
                  {opportunity.Amount && (
                    <span className="text-gray-600">
                      {formatCurrency(opportunity.Amount)}
                    </span>
                  )}
                </div>
                {opportunity.CloseDate && (
                  <div className="text-xs text-gray-600">
                    Close: {formatDate(opportunity.CloseDate)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Opportunity Info */}
      {selectedOpportunity && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Opportunity</h4>
          <div className="text-sm text-blue-700">
            <div><strong>Name:</strong> {selectedOpportunity.Name}</div>
            <div><strong>Stage:</strong> {selectedOpportunity.StageName}</div>
            {selectedOpportunity.Amount && (
              <div><strong>Amount:</strong> {formatCurrency(selectedOpportunity.Amount)}</div>
            )}
            {selectedOpportunity.CloseDate && (
              <div><strong>Close Date:</strong> {formatDate(selectedOpportunity.CloseDate)}</div>
            )}
            {selectedOpportunity.Description && (
              <div className="mt-2">
                <strong>Description:</strong>
                <p className="text-gray-600 mt-1">{selectedOpportunity.Description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Opportunities Message */}
      {!isLoading && opportunities.length === 0 && !error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800">
            No opportunities found for this account. You may need to create opportunities in Salesforce.
          </div>
        </div>
      )}
    </div>
  );
} 