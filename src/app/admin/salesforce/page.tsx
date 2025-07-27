'use client';

import { useState, useEffect } from 'react';

interface SalesforceConfig {
  id: string;
  username: string;
  password: string;
  securityToken?: string;
  loginUrl: string;
  isActive: boolean;
  lastTested?: string;
  lastError?: string;
}

export default function SalesforceAdminPage() {
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
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
      const response = await fetch('/api/admin/salesforce/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else if (response.status === 404) {
        // No config exists yet, create empty form
        setConfig({
          id: '',
          username: '',
          password: '',
          securityToken: '',
          loginUrl: 'https://login.salesforce.com',
          isActive: true,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: 'Failed to load Salesforce configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/salesforce/config', {
        method: config?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Salesforce configuration saved successfully!' });
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
      const response = await fetch('/api/admin/salesforce/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Salesforce connection test successful!' 
        });
        // Reload config to get updated lastTested timestamp
        await loadConfig();
      } else {
        throw new Error(data.details || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDebugConnection = async () => {
    setIsTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/salesforce/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Debug successful! ${JSON.stringify(data.debug, null, 2)}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Debug failed: ${data.details}\n\nDebug info: ${JSON.stringify(data.debug, null, 2)}` 
        });
      }
    } catch (error) {
      console.error('Error in debug:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Debug failed' });
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
        <h1 className="text-2xl font-bold text-gray-900">Salesforce Configuration</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage Salesforce credentials for customer data integration
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

          {/* Login URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salesforce Login URL
            </label>
            <input
              type="text"
              value={config?.loginUrl || 'https://login.salesforce.com'}
              onChange={(e) => setConfig(prev => prev ? { ...prev, loginUrl: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://your-org.my.salesforce.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter your Salesforce login URL. For your dev org, use: https://ronfeathersdevorg-dev-ed.my.salesforce.com (not the lightning.force.com URL)
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              type="text"
              value={config?.username || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, username: e.target.value } : null)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your-email@company.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={config?.password || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, password: e.target.value } : null)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your Salesforce password"
            />
          </div>

          {/* Security Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Token
            </label>
            <input
              type="password"
              value={config?.securityToken || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, securityToken: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your security token (optional)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Get your security token from Setup → My Personal Information → Reset My Security Token
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={config?.isActive || false}
              onChange={(e) => setConfig(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Enable Salesforce integration
            </label>
          </div>

          {/* Last Tested Info */}
          {config?.lastTested && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Status</h3>
              <div className="text-sm text-gray-600">
                <p>Last tested: {new Date(config.lastTested).toLocaleString()}</p>
                {config.lastError && (
                  <p className="text-red-600 mt-1">Last error: {config.lastError}</p>
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
              disabled={isTesting || !config?.username || !config?.password}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleDebugConnection}
              disabled={isTesting || !config?.username || !config?.password}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-400"
            >
              {isTesting ? 'Debugging...' : 'Debug Connection'}
            </button>

            <a
              href="/sow"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-block"
            >
              Back to SOWs
            </a>
          </div>
        </form>
      </div>
    </div>
  );
} 