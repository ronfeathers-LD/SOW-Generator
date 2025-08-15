'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface GeminiLog {
  id: string;
  created_at: string;
  endpoint: string;
  method: string;
  customer_name: string;
  transcript_length: number;
  prompt_content: string;
  gemini_response: string;
  parsed_result?: Record<string, unknown>;
  error_message?: string;
  model_used: string;
  api_key_hash: string;
  processing_time_ms: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

export default function GeminiLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<GeminiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<GeminiLog | null>(null);
  const [filters, setFilters] = useState({
    customerName: '',
    success: '',
    modelUsed: '',
    startDate: '',
    endDate: ''
  });



  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.customerName) params.append('customerName', filters.customerName);
      if (filters.success) params.append('success', filters.success);
      if (filters.modelUsed) params.append('modelUsed', filters.modelUsed);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/gemini-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load logs when component mounts
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchLogs();
  }, [session, status, router, fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      customerName: '',
      success: '',
      modelUsed: '',
      startDate: '',
      endDate: ''
    });
    fetchLogs();
  };

  const cleanupOldLogs = async () => {
    if (!confirm('This will delete logs older than 30 days. Continue?')) return;
    
    try {
      const response = await fetch('/api/admin/gemini-logs?daysToKeep=30', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully deleted ${result.deletedCount} old logs`);
        fetchLogs();
      } else {
        throw new Error('Failed to cleanup logs');
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      alert('Failed to cleanup old logs');
    }
  };

  const formatMetadata = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) return 'No metadata';
    
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gemini AI Logs</h1>
        <p className="text-gray-600">
          Track all Gemini API calls to debug AI content generation issues
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input
              type="text"
              value={filters.customerName}
              onChange={(e) => handleFilterChange('customerName', e.target.value)}
              placeholder="Filter by customer"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange('success', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model Used</label>
            <select
              value={filters.modelUsed}
              onChange={(e) => handleFilterChange('modelUsed', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Models</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={cleanupOldLogs}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Cleanup Old Logs (30+ days)
        </button>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.model_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.processing_time_ms}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          const details = {
                            'Customer': log.customer_name,
                            'Endpoint': log.endpoint,
                            'Method': log.method,
                            'Model': log.model_used,
                            'Success': log.success,
                            'Processing Time': `${log.processing_time_ms}ms`,
                            'Transcript Length': log.transcript_length,
                            'Error': log.error_message || 'None',
                            'Prompt': log.prompt_content,
                            'Response': log.gemini_response,
                            'Parsed Result': log.parsed_result ? JSON.stringify(log.parsed_result, null, 2) : 'None'
                          };
                          
                          const detailsText = Object.entries(details)
                            .map(([key, value]) => `${key}:\n${value}`)
                            .join('\n\n');
                          
                          navigator.clipboard.writeText(detailsText);
                          alert('Log details copied to clipboard!');
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Copy Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900">{selectedLog.customer_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedLog.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <p className="text-sm text-gray-900">{selectedLog.model_used}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Processing Time</label>
                  <p className="text-sm text-gray-900">{selectedLog.processing_time_ms}ms</p>
                </div>
              </div>

              {/* Transcript Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">1. What Was Sent to Gemini</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Transcript Length:</strong> {selectedLog.transcript_length} characters
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Note:</strong> Full transcript is included in the prompt below
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                      View Full Prompt (including transcript)
                    </summary>
                    <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.prompt_content}
                    </pre>
                  </details>
                </div>
              </div>

              {/* AI Response */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">2. Direct Response from AI</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Response Length:</strong> {selectedLog.gemini_response.length} characters
                  </p>
                  <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.gemini_response}
                  </pre>
                </div>
              </div>

              {/* Generated Markup */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">3. Generated Markup/Result</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {selectedLog.parsed_result ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Parsing Status:</strong> Successfully parsed
                      </p>
                      <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.parsed_result, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Parsing Status:</strong> No parsed result available
                      </p>
                      <p className="text-sm text-gray-500">
                        This could indicate a parsing failure or that the endpoint doesn&apos;t return structured data.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Information */}
              {selectedLog.error_message && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-red-600">Error Information</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Additional Context</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {formatMetadata(selectedLog.metadata)}
                  </pre>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
