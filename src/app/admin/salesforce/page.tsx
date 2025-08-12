'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SalesforceConfig {
  id: string;
  username: string;
  password: string;
  security_token?: string;
  login_url: string;
  is_active: boolean;
  last_tested?: string;
  last_error?: string;
  original_username?: string;
  original_password?: string;
  original_security_token?: string;
  original_login_url?: string;
}

export default function SalesforceAdminPage() {
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/salesforce/config');
      if (response.ok) {
        const data = await response.json();
        // Store original values for change detection
        const configWithOriginals = {
          ...data.config,
          password: '', // Always start with empty password for security
          originalUsername: data.config.username,
          originalPassword: '', // Don't store original password in state
          originalSecurityToken: data.config.security_token,
          originalLoginUrl: data.config.login_url,
        };
        setConfig(configWithOriginals);
      } else if (response.status === 404) {
        // No config exists yet, create empty form
        setConfig({
          id: '',
          username: '',
          password: '',
          security_token: '',
          login_url: 'https://login.salesforce.com',
          is_active: true,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: 'Failed to load Salesforce configuration' });
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove config dependency

  // Function to reload config while preserving current password
  const reloadConfigPreservingPassword = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/salesforce/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...data.config,
          password: prev?.password || '', // Preserve current password
          originalUsername: data.config.username,
          originalPassword: prev?.password || '', // Preserve current password
          originalSecurityToken: data.config.security_token,
          originalLoginUrl: data.config.login_url,
        }));
      }
    } catch (error) {
      console.error('Error reloading config:', error);
    }
  }, []);

  // Load config on component mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
        body: JSON.stringify({
          id: config?.id,
          username: config?.username,
          password: config?.password,
          securityToken: config?.security_token,
          loginUrl: config?.login_url,
          isActive: config?.is_active,
        }),
      });

      if (response.ok) {
        // Reload config to get updated data while preserving the password
        await reloadConfigPreservingPassword();
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
      // Check if form has unsaved changes
      const hasChanges = config && (
        config.username !== config.original_username ||
        config.password !== config.original_password ||
        config.security_token !== config.original_security_token ||
        config.login_url !== config.original_login_url
      );

      const response = await fetch('/api/admin/salesforce/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: hasChanges ? JSON.stringify({
          username: config?.username,
          password: config?.password,
          securityToken: config?.security_token,
          loginUrl: config?.login_url,
          useFormData: true
        }) : undefined,
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Salesforce connection test successful! ${hasChanges ? '(using form data)' : '(using stored credentials)'}` 
        });
        // Reload config to get updated last_tested timestamp, but preserve the password
        await reloadConfigPreservingPassword();
      } else {
        const data = await response.json();
        throw new Error(data.details || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Connection test failed' });
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
              value={config?.login_url || 'https://login.salesforce.com'}
              onChange={(e) => setConfig(prev => prev ? { ...prev, login_url: e.target.value } : null)}
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
              value={config?.security_token || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, security_token: e.target.value } : null)}
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
              checked={config?.is_active || false}
              onChange={(e) => setConfig(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Enable Salesforce integration
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

          {/* Test Mode Info */}
          {config?.id && !config?.password && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Test Mode</h3>
              <p className="text-sm text-blue-700">
                Test buttons will use stored credentials from the database. Enter a password to test with form data instead.
              </p>
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
              disabled={isTesting || !config?.username || (!config?.password && !config?.id)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
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