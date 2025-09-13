'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function DebugSOWDataPage() {
  const params = useParams();
  const sowId = params.id as string;
  const [data, setData] = useState<{
    sow?: {
      id: string;
      sow_title: string;
      client_name: string;
      [key: string]: unknown;
    };
    salesforceData?: {
      data: {
        account_data: {
          account_segment?: string;
          name?: string;
          id?: string;
          number_of_employees?: number;
        };
      };
    };
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSOWData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch SOW data
      const sowResponse = await fetch(`/api/sow/${sowId}`);
      const sowData = await sowResponse.json();

      // Fetch Salesforce data
      const salesforceResponse = await fetch(`/api/sow/${sowId}/salesforce-data`);
      const salesforceData = await salesforceResponse.json();

      setData({
        sow: sowData,
        salesforceData: salesforceData
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [sowId]);

  useEffect(() => {
    if (sowId) {
      fetchSOWData();
    }
  }, [sowId, fetchSOWData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading SOW data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={fetchSOWData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Debug SOW Data - {sowId}
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOW Data */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SOW Data</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(data?.sow, null, 2)}
                </pre>
              </div>
            </div>

            {/* Salesforce Data */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Salesforce Data</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(data?.salesforceData, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Account Segment Analysis */}
          {data?.salesforceData?.data?.account_data && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Account Segment Analysis</h3>
              <div className="space-y-2">
                <p><strong>Account Name:</strong> {data.salesforceData.data.account_data.name}</p>
                <p><strong>Account ID:</strong> {data.salesforceData.data.account_data.id}</p>
                <p><strong>Account Segment:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                    data.salesforceData.data.account_data.account_segment === 'EC' || 
                    data.salesforceData.data.account_data.account_segment === 'MM' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {data.salesforceData.data.account_data.account_segment || 'Not Set'}
                  </span>
                </p>
                <p><strong>PM Removal Allowed:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                    data.salesforceData.data.account_data.account_segment === 'EC' || 
                    data.salesforceData.data.account_data.account_segment === 'MM' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {data.salesforceData.data.account_data.account_segment === 'EC' || 
                     data.salesforceData.data.account_data.account_segment === 'MM' 
                      ? 'YES' 
                      : 'NO'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {!data?.salesforceData?.data?.account_data && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-md">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Salesforce Data Found</h3>
              <p className="text-yellow-800">
                This SOW doesn&apos;t have any Salesforce account data stored. 
                You need to select a customer from Salesforce in the Customer Information tab.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
