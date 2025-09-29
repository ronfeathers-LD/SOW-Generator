'use client';

import { useState, useEffect, useCallback } from 'react';

interface FieldInfo {
  name: string;
  label: string;
  type: string;
  custom: boolean;
  length?: number;
  required: boolean;
  defaultValue?: string | number | boolean | null;
  value?: string | number | boolean | null;
}

interface SalesforceData {
  opportunity: {
    id: string;
    name: string;
    stage: string;
    accountId: string;
    amount: number;
    closeDate: string;
    totalFields: number;
    partnerFields: FieldInfo[];
    customFields: FieldInfo[];
    allFields: FieldInfo[];
  };
  account: {
    id: string;
    name: string;
    type: string;
    industry: string;
    totalFields: number;
    partnerFields: FieldInfo[];
    customFields: FieldInfo[];
    allFields: FieldInfo[];
  };
  metadata: {
    opportunityObject: {
      totalFields: number;
      customFields: number;
      standardFields: number;
    };
    accountObject: {
      totalFields: number;
      customFields: number;
      standardFields: number;
    };
  };
}

export default function AdminSalesforceFieldsExplorer() {
  const [data, setData] = useState<SalesforceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'opportunity' | 'account'>('opportunity');
  const [filterType, setFilterType] = useState<'all' | 'partner' | 'custom' | 'standard'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [opportunityId, setOpportunityId] = useState('006PL00000TTafOYAT');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/salesforce/fields-explorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch Salesforce fields');
      }
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchData();
  }, [opportunityId, fetchData]);

  const getFilteredFields = (fields: FieldInfo[]) => {
    let filtered = fields;
    
    // Apply type filter
    switch (filterType) {
      case 'partner':
        filtered = fields.filter(field => {
          const nameLower = field.name.toLowerCase();
          const labelLower = field.label.toLowerCase();
          return nameLower.includes('partner') || 
                 nameLower.includes('channel') ||
                 nameLower.includes('source') ||
                 nameLower.includes('referral') ||
                 nameLower.includes('reseller') ||
                 nameLower.includes('distributor') ||
                 nameLower.includes('parent') ||
                 labelLower.includes('partner') ||
                 labelLower.includes('channel') ||
                 labelLower.includes('source') ||
                 labelLower.includes('referral');
        });
        break;
      case 'custom':
        filtered = fields.filter(field => field.custom);
        break;
      case 'standard':
        filtered = fields.filter(field => !field.custom);
        break;
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(field => 
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const formatValue = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return value.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Salesforce fields...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchData}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentData = activeTab === 'opportunity' ? data.opportunity : data.account;
  const filteredFields = getFilteredFields(currentData.allFields);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Salesforce Fields Explorer</h1>
          <p className="mt-2 text-gray-600">
            Admin tool for exploring Salesforce object fields and partner relationships
          </p>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opportunity ID
                </label>
                <input
                  type="text"
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                  placeholder="Enter Salesforce Opportunity ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Fields'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Fields
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by field name or label..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'partner' | 'custom' | 'standard')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Fields ({currentData.allFields.length})</option>
                  <option value="partner">Partner Fields ({getFilteredFields(currentData.allFields).length})</option>
                  <option value="custom">Custom Fields ({currentData.customFields.length})</option>
                  <option value="standard">Standard Fields ({currentData.allFields.filter(f => !f.custom).length})</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Opportunity Fields</h3>
            <p className="text-3xl font-bold text-blue-600">{data.opportunity.totalFields}</p>
            <p className="text-sm text-gray-500">
              {data.metadata.opportunityObject.customFields} custom, {data.metadata.opportunityObject.standardFields} standard
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Account Fields</h3>
            <p className="text-3xl font-bold text-green-600">{data.account.totalFields}</p>
            <p className="text-sm text-gray-500">
              {data.metadata.accountObject.customFields} custom, {data.metadata.accountObject.standardFields} standard
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Partner Fields</h3>
            <p className="text-3xl font-bold text-purple-600">
              {data.opportunity.partnerFields.length + data.account.partnerFields.length}
            </p>
            <p className="text-sm text-gray-500">
              {data.opportunity.partnerFields.length} opp, {data.account.partnerFields.length} account
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
            <p className="text-3xl font-bold text-orange-600">
              {data.opportunity.customFields.length + data.account.customFields.length}
            </p>
            <p className="text-sm text-gray-500">
              {data.opportunity.customFields.length} opp, {data.account.customFields.length} account
            </p>
          </div>
        </div>

        {/* Partner Fields Highlight */}
        {(data.opportunity.partnerFields.length > 0 || data.account.partnerFields.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-yellow-800 mb-4">🤝 Partner-Related Fields Found!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.opportunity.partnerFields.length > 0 && (
                <div>
                  <h3 className="font-medium text-yellow-800 mb-2">Opportunity Partner Fields:</h3>
                  <ul className="space-y-1">
                    {data.opportunity.partnerFields.map(field => (
                      <li key={field.name} className="text-sm">
                        <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{field.name}</span>
                        <span className="ml-2 text-yellow-700">({field.label})</span>
                        {field.value && (
                          <span className="ml-2 text-yellow-600">= {formatValue(field.value)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {data.account.partnerFields.length > 0 && (
                <div>
                  <h3 className="font-medium text-yellow-800 mb-2">Account Partner Fields:</h3>
                  <ul className="space-y-1">
                    {data.account.partnerFields.map(field => (
                      <li key={field.name} className="text-sm">
                        <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{field.name}</span>
                        <span className="ml-2 text-yellow-700">({field.label})</span>
                        {field.value && (
                          <span className="ml-2 text-yellow-600">= {formatValue(field.value)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('opportunity')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'opportunity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Opportunity Fields ({data.opportunity.totalFields})
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'account'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Account Fields ({data.account.totalFields})
              </button>
            </nav>
          </div>
        </div>

        {/* Fields Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {activeTab === 'opportunity' ? 'Opportunity' : 'Account'} Fields
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Showing {filteredFields.length} of {currentData.allFields.length} fields
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFields.map((field) => (
                  <tr key={field.name} className={field.custom ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-900">{field.name}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {field.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.type}
                      {field.length && <span className="ml-1">({field.length})</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {field.custom ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Custom
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {field.required ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Required
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Optional</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {formatValue(field.value)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
