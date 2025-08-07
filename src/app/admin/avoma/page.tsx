'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AvomaConfig {
  id: string;
  api_key: string;
  api_url: string;
  is_active: boolean;
  last_tested?: string;
  last_error?: string;
  customer_id?: string;
}

export default function AvomaAdminPage() {
  const [config, setConfig] = useState<AvomaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load config on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/avoma/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else if (response.status === 404) {
        // No config exists yet, create empty form
        setConfig({
          id: '',
          api_key: '',
          api_url: 'https://api.avoma.com/v1',
          is_active: true,
          customer_id: '',
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: 'Failed to load Avoma configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/avoma/config', {
        method: config?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config?.api_key || '',
          apiUrl: config?.api_url || 'https://api.avoma.com/v1',
          isActive: config?.is_active || true,
          customerId: config?.customer_id || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Avoma configuration saved successfully!' });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/avoma/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config?.api_key || '',
          apiUrl: config?.api_url || 'https://api.avoma.com/v1',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Avoma connection test successful!' 
        });
        // Reload config to get updated last_tested timestamp
        await loadConfig();
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSearchTest = async () => {
    setIsTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/avoma/search-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config?.api_key || '',
          apiUrl: config?.api_url || 'https://api.avoma.com/v1',
          testCustomerName: 'Test Customer'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Search test successful! Found ${data.calls?.length || 0} calls for test customer.` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Search test failed: ${data.error}` 
        });
      }
    } catch (error) {
      console.error('Error in search test:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Search test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avoma Configuration</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage Avoma API credentials for scoping call integration
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avoma API URL
            </label>
            <input
              type="text"
              value={config?.api_url || 'https://api.avoma.com/v1'}
              onChange={(e) => setConfig(prev => prev ? { ...prev, api_url: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://api.avoma.com/v1"
            />
            <p className="mt-1 text-sm text-gray-500">
              The base URL for the Avoma API
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key *
            </label>
            <input
              type="text"
              value={config?.api_key || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, api_key: e.target.value } : null)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your Avoma API key"
            />
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from your Avoma account settings
            </p>
          </div>

          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer ID (Optional)
            </label>
            <input
              type="text"
              value={config?.customer_id || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, customer_id: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your Avoma customer ID"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your Avoma customer ID if required for API access
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={config?.is_active || false}
              onChange={(e) => setConfig(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Enable Avoma integration
            </label>
          </div>

          {/* Last Tested Info */}
          {config?.last_tested && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Status</h3>
              <div className="text-sm text-gray-600">
                <p>Last tested: {new Date(config.last_tested).toLocaleString()}</p>
                {config.last_error && (
                  <p className="text-red-600 mt-1">Last error: {config.last_error}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config?.api_key}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSearchTest}
              disabled={isTesting || !config?.api_key}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isTesting ? 'Testing...' : 'Test Search'}
            </button>

            <Link
              href="/sow"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-block"
            >
              Back to SOWs
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 