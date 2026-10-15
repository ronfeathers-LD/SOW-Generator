'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type AuthMethod = 'password' | 'client_credentials';

interface SalesforceConfig {
  id: string;
  username: string;
  password: string;
  security_token?: string;
  auth_method?: AuthMethod;
  client_id?: string;
  client_secret?: string;
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
          client_secret: '', // Same for the consumer secret (never returned by the API)
          auth_method: data.config.auth_method || 'password',
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
          auth_method: 'client_credentials',
          client_id: '',
          client_secret: '',
          login_url: '',
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
          client_secret: prev?.client_secret || '', // Preserve current consumer secret
          auth_method: data.config.auth_method || 'password',
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
          authMethod,
          clientId: config?.client_id,
          clientSecret: config?.client_secret,
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
      // Use form data when the secret for the selected method has been entered;
      // otherwise the server tests the stored credentials.
      const hasChanges = !!(isClientCredentials ? config?.client_secret : config?.password);

      const response = await fetch('/api/admin/salesforce/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: hasChanges ? JSON.stringify({
          authMethod,
          username: config?.username,
          password: config?.password,
          securityToken: config?.security_token,
          clientId: config?.client_id,
          clientSecret: config?.client_secret,
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



  const authMethod: AuthMethod = config?.auth_method === 'client_credentials' ? 'client_credentials' : 'password';
  const isClientCredentials = authMethod === 'client_credentials';
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500';

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

          {/* Auth method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Method
            </label>
            <select
              value={authMethod}
              onChange={(e) => setConfig(prev => prev ? { ...prev, auth_method: e.target.value as AuthMethod } : null)}
              className={inputClass}
            >
              <option value="client_credentials">OAuth client credentials (recommended)</option>
              <option value="password">Username + password + token</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {isClientCredentials
                ? 'Uses a Connected App consumer key and secret. The run-as user is set on the Connected App in Salesforce. Required for Integration-license users, which cannot get a security token.'
                : 'Signs in as a user with a password and security token.'}
            </p>
          </div>

          {/* Login URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isClientCredentials ? 'Salesforce My Domain URL *' : 'Salesforce Login URL'}
            </label>
            <input
              type="text"
              value={isClientCredentials ? (config?.login_url || '') : (config?.login_url || 'https://login.salesforce.com')}
              onChange={(e) => setConfig(prev => prev ? { ...prev, login_url: e.target.value } : null)}
              required={isClientCredentials}
              className={inputClass}
              placeholder={isClientCredentials ? 'https://leandata.my.salesforce.com' : 'https://your-org.my.salesforce.com'}
            />
            <p className="mt-1 text-sm text-gray-500">
              {isClientCredentials
                ? "Client credentials needs your org's My Domain URL, not login.salesforce.com or test.salesforce.com."
                : 'Enter your Salesforce login URL. For your dev org, use: https://ronfeathersdevorg-dev-ed.my.salesforce.com (not the lightning.force.com URL)'}
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isClientCredentials ? 'Run-as Username *' : 'Username *'}
            </label>
            <input
              type="text"
              value={config?.username || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, username: e.target.value } : null)}
              required
              className={inputClass}
              placeholder={isClientCredentials ? 'integration-user@company.com' : 'your-email@company.com'}
            />
            {isClientCredentials && (
              <p className="mt-1 text-sm text-gray-500">
                Label only. The actual run-as user is configured on the Connected App in Salesforce.
              </p>
            )}
          </div>

          {isClientCredentials ? (
            <>
              {/* Consumer Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consumer Key *
                </label>
                <input
                  type="text"
                  value={config?.client_id || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, client_id: e.target.value } : null)}
                  required
                  className={inputClass}
                  placeholder="Connected App consumer key"
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consumer Secret *
                </label>
                <input
                  type="password"
                  value={config?.client_secret || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, client_secret: e.target.value } : null)}
                  required
                  className={inputClass}
                  placeholder="Connected App consumer secret"
                />
              </div>
            </>
          ) : (
            <>
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
                  className={inputClass}
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
                  className={inputClass}
                  placeholder="Your security token (optional)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Get your security token from Setup → My Personal Information → Reset My Security Token
                </p>
              </div>
            </>
          )}

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
          {config?.id && !(isClientCredentials ? config?.client_secret : config?.password) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Test Mode</h3>
              <p className="text-sm text-blue-700">
                Test buttons will use stored credentials from the database. Enter a {isClientCredentials ? 'consumer secret' : 'password'} to test with form data instead.
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
              disabled={isTesting || !config?.username || (!(isClientCredentials ? config?.client_secret : config?.password) && !config?.id)}
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