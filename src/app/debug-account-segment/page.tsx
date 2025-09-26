'use client';

import { useState } from 'react';

export default function DebugAccountSegmentPage() {
  const [accountId, setAccountId] = useState('');
  const [result, setResult] = useState<{
    account?: {
      id: string;
      name: string;
      Employee_Band__c?: string;
      NumberOfEmployees?: number;
    };
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const testAccountSegment = async () => {
    if (!accountId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/salesforce/test-account-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: accountId.trim() }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error testing account segment:', error);
      setResult({ error: 'Failed to test account segment' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Debug Account Segment</h1>
          
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
                placeholder="Enter Salesforce Account ID (e.g., 001XX000004DHPY)"
                className="block w-full px-4 py-3 border border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={testAccountSegment}
              disabled={loading || !accountId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Account Segment'}
            </button>
          </div>

          {result && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Result:</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Expected Account Segment Values:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>LE</strong> - Large Enterprise (4501+ employees)</li>
              <li><strong>EE</strong> - Emerging Enterprise (1001-4500 employees)</li>
              <li><strong>MM</strong> - MidMarket (251-1000 employees) → <strong>PM Hours removal allowed</strong></li>
              <li><strong>EC</strong> - Emerging Commercial (250 or fewer employees) → <strong>PM Hours removal allowed</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
