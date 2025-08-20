'use client';

import { useState, useEffect } from 'react';



interface GoogleDriveConfig {
  id: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  refresh_token?: string;
  access_token?: string;
  token_expiry?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GoogleDriveConfigPage() {
  const [config, setConfig] = useState<GoogleDriveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  



  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/google-drive/config');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setConfig(data);
        }
      } else {
        console.error('Error loading config:', response.statusText);
        setMessage({ type: 'error', text: 'Failed to load configuration' });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const configData = {
        client_id: formData.get('client_id') as string,
        client_secret: formData.get('client_secret') as string,
        redirect_uri: formData.get('redirect_uri') as string,
        refresh_token: formData.get('refresh_token') as string || null,
        is_active: true
      };

      const response = await fetch('/api/admin/google-drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/google-drive/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'test', 
          useAI: false 
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Connection test successful! Google Drive integration is working.' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection test failed');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Connection test failed' 
      });
    } finally {
      setSaving(false);
    }
  };

  const startOAuth = async () => {
    try {
      setSaving(true);
      const resp = await fetch('/api/admin/google-drive/oauth/start');
      if (!resp.ok) throw new Error('Failed to start OAuth');
      const { authUrl } = await resp.json();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'OAuth start failed' });
    } finally {
      setSaving(false);
    }
  };

  const deactivateConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/google-drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...config, is_active: false }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration deactivated successfully!' });
        setConfig(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate configuration');
      }
    } catch (error) {
      console.error('Error deactivating config:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to deactivate configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Google Drive Configuration</h1>
          <p className="mt-2 text-gray-600">
            Configure Google Drive API integration for AI-powered folder search and analysis.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {config ? 'Edit Configuration' : 'New Configuration'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                  Client ID
                </label>
                <input
                  type="text"
                  name="client_id"
                  id="client_id"
                  required
                  defaultValue={config?.client_id || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter Google OAuth2 Client ID"
                />
              </div>

              <div>
                <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    name="client_secret"
                    id="client_secret"
                    required
                    defaultValue={config?.client_secret || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Google OAuth2 Client Secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <span className="text-gray-400 hover:text-gray-600">
                      {showSecrets ? '🙈' : '👁️'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="redirect_uri" className="block text-sm font-medium text-gray-700">
                Redirect URI
              </label>
              <input
                type="url"
                name="redirect_uri"
                id="redirect_uri"
                required
                defaultValue={config?.redirect_uri || ''}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://yourdomain.com/auth/google/callback"
              />
              <p className="mt-1 text-sm text-gray-500">
                This should match the redirect URI configured in your Google Cloud Console.
              </p>
            </div>

            <div>
              <label htmlFor="refresh_token" className="block text-sm font-medium text-gray-700">
                Refresh Token (Optional)
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  name="refresh_token"
                  id="refresh_token"
                  defaultValue={config?.refresh_token || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter OAuth2 Refresh Token"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className="text-gray-400 hover:text-gray-600">
                    {showSecrets ? '🙈' : '👁️'}
                  </span>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                If provided, the system will use this token for API access. Otherwise, users will need to authenticate each time.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (config ? 'Update Configuration' : 'Save Configuration')}
                </button>

                <button
                  type="button"
                  onClick={startOAuth}
                  disabled={saving}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify OAuth (Client ID/Secret)
                </button>

                {config && (
                  <>
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={saving}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Test Connection
                    </button>

                    <button
                      type="button"
                      onClick={deactivateConfig}
                      disabled={saving}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deactivate
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Setup Instructions</h3>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium">1. Google Cloud Console Setup</h4>
              <p>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> and:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Create a new project or select existing one</li>
                <li>Enable Google Drive API</li>
                <li>Create OAuth2 credentials (Web application type)</li>
                <li>Add your redirect URI to the authorized redirect URIs</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">2. OAuth2 Flow</h4>
              <p>For production use, implement the full OAuth2 flow to obtain refresh tokens. For testing, you can manually generate a refresh token using Google&apos;s OAuth2 playground.</p>
            </div>

            <div>
              <h4 className="font-medium">3. AI Integration</h4>
              <p>This integration works with your existing Gemini configuration to provide intelligent folder search and analysis capabilities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
