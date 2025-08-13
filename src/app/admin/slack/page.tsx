'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
  isEnabled: boolean;
}

export default function SlackConfigPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<SlackConfig>({
    webhookUrl: '',
    channel: '',
    username: 'SOW Generator',
    iconEmoji: ':memo:',
    isEnabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'admin') {
      redirect('/admin');
    }
  }, [session, status]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/slack/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading Slack config:', error);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/slack/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Slack configuration saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/slack/test', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test message sent successfully! Check your Slack channel.' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to send test message' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test message' });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Slack Integration</h1>
            <p className="mt-2 text-gray-600">
              Configure Slack notifications for SOW approvals, status changes, and other important events.
            </p>
          </div>

          {/* Configuration Form */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Slack Configuration</h3>
            </div>
            
            <form onSubmit={saveConfig} className="p-6 space-y-6">
              {/* Webhook URL */}
              <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  id="webhookUrl"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://hooks.slack.com/services/..."
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Create a webhook in your Slack workspace and paste the URL here.
                </p>
              </div>

              {/* Channel */}
              <div>
                <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Channel
                </label>
                <input
                  type="text"
                  id="channel"
                  value={config.channel}
                  onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#general"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to use the webhook&apos;s default channel, or specify a channel (e.g., #sow-approvals).
                </p>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SOW Generator"
                />
              </div>

              {/* Icon Emoji */}
              <div>
                <label htmlFor="iconEmoji" className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Icon Emoji
                </label>
                <input
                  type="text"
                  id="iconEmoji"
                  value={config.iconEmoji}
                  onChange={(e) => setConfig({ ...config, iconEmoji: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=":memo:"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Use Slack emoji format (e.g., :memo:, :robot_face:, :rocket:)
                </p>
              </div>

              {/* Enable/Disable */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable Slack notifications
                </label>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </button>
                
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={isLoading || !config.webhookUrl}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                >
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </form>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Set Up Slack Integration</h3>
            <div className="space-y-4 text-sm text-blue-800">
              <div>
                <h4 className="font-medium">1. Create a Slack App</h4>
                <p>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com/apps</a> and create a new app for your workspace.</p>
              </div>
              
              <div>
                <h4 className="font-medium">2. Enable Incoming Webhooks</h4>
                <p>In your app settings, go to &quot;Incoming Webhooks&quot; and activate them.</p>
              </div>
              
              <div>
                <h4 className="font-medium">3. Create a Webhook</h4>
                <p>Click &quot;Add New Webhook to Workspace&quot; and choose the channel where you want to receive notifications.</p>
              </div>
              
              <div>
                <h4 className="font-medium">4. Copy the Webhook URL</h4>
                <p>Copy the generated webhook URL and paste it in the configuration above.</p>
              </div>
              
              <div>
                <h4 className="font-medium">5. Test the Integration</h4>
                <p>Use the &quot;Test Connection&quot; button to verify everything is working correctly.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
