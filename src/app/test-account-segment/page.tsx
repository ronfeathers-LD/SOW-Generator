'use client';

import { useState } from 'react';

export default function TestAccountSegmentPage() {
  const [accountId, setAccountId] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    account: {
      id: string;
      name: string;
      numberOfEmployees: number;
      employeeBand: string;
    };
    fieldInfo: {
      fieldName: string;
      fieldLabel: string;
      fieldType: string;
      isCalculated: boolean;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!accountId.trim()) {
      setError('Please enter an Account ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/salesforce/test-account-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: accountId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to query account segment');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test Account Segment Formula Field
          </h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Account ID
              </label>
              <input
                type="text"
                id="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Enter Salesforce Account ID (e.g., 001XXXXXXXXXXXXXXX)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Account Segment Query'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-lg font-medium text-green-800 mb-3">Query Results</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Account ID:</span> {result.account.id}
                  </div>
                  <div>
                    <span className="font-medium">Account Name:</span> {result.account.name}
                  </div>
                  <div>
                    <span className="font-medium">Number of Employees:</span> {result.account.numberOfEmployees || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Account Segment Formula (Employee_Band__c):</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                      result.account.employeeBand 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result.account.employeeBand || 'No value returned'}
                    </span>
                  </div>
                </div>

                {result.fieldInfo && (
                  <div className="mt-4 p-3 bg-blue-100 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">Field Information:</h4>
                    <div className="text-sm text-blue-700">
                      <div><strong>Field Name:</strong> {result.fieldInfo.fieldName}</div>
                      <div><strong>Field Label:</strong> {result.fieldInfo.fieldLabel}</div>
                      <div><strong>Field Type:</strong> {result.fieldInfo.fieldType}</div>
                      <div><strong>Is Formula Field:</strong> {result.fieldInfo.isCalculated ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-green-700 hover:text-green-800">
                    View Raw Response
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Expected Account Segment Values:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>LE</strong> - Large Enterprise (4501+ employees)</li>
              <li><strong>EE</strong> - Emerging Enterprise (1001-4500 employees)</li>
              <li><strong>MM</strong> - MidMarket (251-1000 employees)</li>
              <li><strong>EC</strong> - Emerging Commercial (250 or fewer employees)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
