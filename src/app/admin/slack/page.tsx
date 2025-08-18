'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';
import { SlackUser } from '@/lib/slack-user-lookup';

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
  isEnabled: boolean;
  botToken?: string;
  workspaceDomain?: string;
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; warning?: string } | null>(null);

  // Team message state
  const [teamMessage, setTeamMessage] = useState({
    message: '',
    mentions: '',
    channel: '',
    title: ''
  });
  const [sendingTeamMessage, setSendingTeamMessage] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'admin') {
      redirect('/admin');
    }
  }, [session, status]);

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
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: result.message,
          warning: result.warning
        });
        // Refresh the status after saving
        await checkSlackStatus();
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

  const sendTeamMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTeamMessage(true);
    setMessage(null);

    try {
      // Extract mentions from the message text using the mention utils
      const { extractMentions } = await import('@/lib/mention-utils');
      const mentionedUsernames = extractMentions(teamMessage.message);
      
      // Get Slack user IDs for the mentioned usernames
      let slackUserIds: string[] = [];
      
      if (mentionedUsernames.length > 0) {
        try {
          const response = await fetch('/api/slack/workspace-users');
          if (response.ok) {
            const slackUsers = await response.json();
            
            // Map usernames to Slack user IDs
            slackUserIds = mentionedUsernames
              .map(username => {
                const user = slackUsers.find((u: SlackUser) => 
                  u.name === username || 
                  u.profile.display_name === username ||
                  u.profile.real_name === username
                );
                return user?.id;
              })
              .filter(id => id) as string[];
          }
        } catch (error) {
          console.error('Error getting Slack user IDs:', error);
        }
      }

      const response = await fetch('/api/slack/team-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: teamMessage.message,
          mentions: slackUserIds,
          channel: teamMessage.channel || undefined,
          title: teamMessage.title || undefined
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Team message sent successfully! Check your Slack channel.' });
        // Clear the form
        setTeamMessage({
          message: '',
          mentions: '',
          channel: '',
          title: ''
        });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to send team message' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send team message' });
    } finally {
      setSendingTeamMessage(false);
    }
  };

  const [testResults, setTestResults] = useState<{ 
    success: boolean; 
    user?: { 
      id: string; 
      name: string; 
      email?: string; 
      team_id?: string; 
      profile?: { 
        display_name?: string; 
        real_name?: string; 
        email?: string 
      };
      debug?: {
        username: string;
        botTokenConfigured: boolean;
        tokenValid: boolean;
        totalUsers: number;
        workspaceInfo?: {
          name: string;
          domain: string;
        };
        lookupResults: {
          byUsername?: { success: boolean; error?: string };
          byEmail?: { success: boolean; error?: string };
          fromAllUsers?: { success: boolean; error?: string };
        };
      };
    } | null; 
    error?: string 
  } | null>(null);
  const [slackStatus, setSlackStatus] = useState<{
    webhookConfigured: boolean;
    botTokenConfigured: boolean;
    canSendMessages: boolean;
    canLookupUsers: boolean;
  }>({
    webhookConfigured: false,
    botTokenConfigured: false,
    canSendMessages: false,
    canLookupUsers: false
  });

  const testUserLookup = async () => {
    const username = document.getElementById('testUsername') as HTMLInputElement;
    const usernameValue = username.value.trim();

    if (!usernameValue) {
      setTestResults({ success: false, error: 'Please enter a username or email to test.' });
      return;
    }

    setTestResults(null); // Clear previous results
    setIsLoading(true);

    try {
      const response = await fetch(`/api/slack/lookup?username=${encodeURIComponent(usernameValue)}`);
      if (response.ok) {
        const data = await response.json();
        setTestResults({ success: true, user: data });
      } else {
        const error = await response.json();
        setTestResults({ success: false, error: error.message || 'Failed to lookup user' });
      }
    } catch (error) {
      setTestResults({ success: false, error: error instanceof Error ? error.message : 'Failed to lookup user' });
    } finally {
      setIsLoading(false);
    }
  };

  // Check Slack service status
  const checkSlackStatus = async () => {
    try {
      const response = await fetch('/api/admin/slack/status');
      if (response.ok) {
        const status = await response.json();
        setSlackStatus(status);
      }
    } catch (error) {
      console.error('Error checking Slack status:', error);
    }
  };

  useEffect(() => {
    loadConfig();
    checkSlackStatus();
  }, []);

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

              {/* Bot Token for @Mentions */}
              <div>
                <label htmlFor="botToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Token (for @Mentions)
                </label>
                <input
                  type="password"
                  id="botToken"
                  value={config.botToken || ''}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="xoxb-your-bot-token-here"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Required for @mention functionality. Get this from your Slack app settings.
                </p>
              </div>

              {/* Workspace Domain */}
              <div>
                <label htmlFor="workspaceDomain" className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Domain
                </label>
                <input
                  type="text"
                  id="workspaceDomain"
                  value={config.workspaceDomain || ''}
                  onChange={(e) => setConfig({ ...config, workspaceDomain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="company.slack.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Your Slack workspace domain (e.g., company.slack.com)
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
                  {message.warning && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                      ⚠️ {message.warning}
                    </div>
                  )}
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

                <button
                  type="button"
                  onClick={async () => {
                    if (config.botToken) {
                      setIsLoading(true);
                      try {
                        const response = await fetch('/api/admin/slack/test-bot-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ botToken: config.botToken })
                        });
                        if (response.ok) {
                          setMessage({ type: 'success', text: 'Bot token is valid! @mentions will work.' });
                        } else {
                          const error = await response.json();
                          setMessage({ type: 'error', text: error.message || 'Bot token validation failed' });
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Failed to validate bot token' });
                      } finally {
                        setIsLoading(false);
                      }
                    } else {
                      setMessage({ type: 'error', text: 'Please enter a bot token first' });
                    }
                  }}
                  disabled={isLoading || !config.botToken}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400"
                >
                  {isLoading ? 'Testing...' : 'Test Bot Token'}
                </button>
              </div>
            </form>
          </div>

          {/* Slack Service Status */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Slack Service Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                Current status of Slack integration services
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Webhook Status */}
                <div className={`p-4 rounded-lg border ${
                  slackStatus.webhookConfigured 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      slackStatus.webhookConfigured ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Webhook Configuration</h4>
                      <p className={`text-sm ${
                        slackStatus.webhookConfigured ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {slackStatus.webhookConfigured 
                          ? '✅ Webhook URL is configured' 
                          : '❌ Webhook URL is missing'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bot Token Status */}
                <div className={`p-4 rounded-lg border ${
                  slackStatus.botTokenConfigured 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      slackStatus.botTokenConfigured ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Bot Token</h4>
                      <p className={`text-sm ${
                        slackStatus.botTokenConfigured ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {slackStatus.botTokenConfigured 
                          ? '✅ Bot token is configured' 
                          : '⚠️ Bot token needed for @mentions'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message Sending Status */}
                <div className={`p-4 rounded-lg border ${
                  slackStatus.canSendMessages 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      slackStatus.canSendMessages ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Message Sending</h4>
                      <p className={`text-sm ${
                        slackStatus.canSendMessages ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {slackStatus.canSendMessages 
                          ? '✅ Can send messages to Slack' 
                          : '❌ Cannot send messages'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Lookup Status */}
                <div className={`p-4 rounded-lg border ${
                  slackStatus.canLookupUsers 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      slackStatus.canLookupUsers ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">User Lookup</h4>
                      <p className={`text-sm ${
                        slackStatus.canLookupUsers ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {slackStatus.canLookupUsers 
                          ? '✅ Can lookup users for @mentions' 
                          : '⚠️ User lookup not available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refresh Status Button */}
              <div className="pt-4">
                <button
                  onClick={checkSlackStatus}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>

          {/* Team Message Form */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Send Team Message</h3>
              <p className="text-sm text-gray-600 mt-1">
                Send a message to your team with optional user mentions
              </p>
            </div>
            
            <form onSubmit={sendTeamMessage} className="p-6 space-y-6">
              {/* Message */}
              <div>
                <label htmlFor="teamMessage" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="teamMessage"
                  value={teamMessage.message}
                  onChange={(e) => setTeamMessage({ ...teamMessage, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your message here..."
                  rows={3}
                  required
                />
              </div>

              {/* Mentions with Autocomplete */}
              <div>
                <label htmlFor="teamMessageMentions" className="block text-sm font-medium text-gray-700 mb-2">
                  Mention Team Members
                </label>
                <MentionAutocomplete
                  value={teamMessage.mentions}
                  onChange={(value) => setTeamMessage({ ...teamMessage, mentions: value })}
                  placeholder="Type @ to mention team members..."
                  rows={2}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Start typing @ to see autocomplete suggestions. Users will be @mentioned in the message.
                </p>
              </div>

              {/* Title (Optional) */}
              <div>
                <label htmlFor="teamMessageTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  id="teamMessageTitle"
                  value={teamMessage.title}
                  onChange={(e) => setTeamMessage({ ...teamMessage, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  placeholder="e.g., Team Update, Important Notice"
                />
              </div>

              {/* Channel Override (Optional) */}
              <div>
                <label htmlFor="teamMessageChannel" className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Override (Optional)
                </label>
                <input
                  type="text"
                  id="teamMessageChannel"
                  value={teamMessage.channel}
                  onChange={(e) => setTeamMessage({ ...teamMessage, channel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#general (leave empty for default)"
                />
              </div>

              {/* Send Button */}
              <div>
                <button
                  type="submit"
                  disabled={sendingTeamMessage || !teamMessage.message}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                >
                  {sendingTeamMessage ? 'Sending...' : 'Send Team Message'}
                </button>
              </div>
            </form>
          </div>

          {/* User Lookup Testing */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Test @Mention User Lookup</h3>
              <p className="text-sm text-gray-600 mt-1">
                Test the @mention functionality by looking up users in your Slack workspace
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="testUsername" className="block text-sm font-medium text-gray-700 mb-2">
                  Username to Test
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="testUsername"
                    placeholder="john.doe or john.doe@company.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        testUserLookup();
                      }
                    }}
                  />
                  <button
                    onClick={testUserLookup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Test Lookup
                  </button>
                  <button
                    onClick={async () => {
                      const username = document.getElementById('testUsername') as HTMLInputElement;
                      const usernameValue = username.value.trim();
                      
                      if (!usernameValue) {
                        setTestResults({ success: false, error: 'Please enter a username to debug.' });
                        return;
                      }
                      
                      setTestResults(null);
                      setIsLoading(true);
                      
                      try {
                        const response = await fetch(`/api/slack/debug-lookup?username=${encodeURIComponent(usernameValue)}`);
                        if (response.ok) {
                          const data = await response.json();
                          setTestResults({ 
                            success: true, 
                            user: data.debug,
                            error: undefined
                          });
                        } else {
                          const error = await response.json();
                          setTestResults({ success: false, error: error.error || 'Debug lookup failed' });
                        }
                      } catch (error) {
                        setTestResults({ success: false, error: error instanceof Error ? error.message : 'Debug lookup failed' });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Debug
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Enter a username (e.g., john.doe) or email to test the lookup. Use Debug for detailed troubleshooting.
                </p>
                <p className="mt-1 text-sm text-blue-600">
                  💡 <strong>Tip:</strong> The system automatically tries different username variations (e.g., &ldquo;ronfeathers&rdquo; → &ldquo;ron.feathers&rdquo;, &ldquo;ron_feathers&rdquo;)
                </p>
              </div>

              {/* Test Results */}
              {testResults && (
                <div className={`p-3 rounded-md ${
                  testResults.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {testResults.success ? (
                    <div>
                      {testResults.user?.profile ? (
                        // Regular user lookup result
                        <>
                          <p className="font-medium">✅ User Found!</p>
                          <p><strong>Name:</strong> {testResults.user?.profile.real_name || testResults.user?.name}</p>
                          <p><strong>Slack ID:</strong> {testResults.user?.id}</p>
                          <p><strong>Email:</strong> {testResults.user?.profile.email || 'Not provided'}</p>
                        </>
                      ) : testResults.user?.debug ? (
                        // Debug information
                        <>
                          <p className="font-medium">🔍 Debug Information</p>
                          <div className="mt-2 space-y-2 text-sm">
                            <div><strong>Username:</strong> {testResults.user.debug.username}</div>
                            <div><strong>Bot Token:</strong> {testResults.user.debug.botTokenConfigured ? '✅ Configured' : '❌ Not Configured'}</div>
                            <div><strong>Token Valid:</strong> {testResults.user.debug.tokenValid ? '✅ Yes' : '❌ No'}</div>
                            <div><strong>Total Users:</strong> {testResults.user.debug.totalUsers}</div>
                            {testResults.user.debug.workspaceInfo && (
                              <div><strong>Workspace:</strong> {testResults.user.debug.workspaceInfo.name} ({testResults.user.debug.workspaceInfo.domain})</div>
                            )}
                            <div className="mt-2">
                              <strong>Lookup Results:</strong>
                              <div className="ml-4 space-y-1">
                                <div>By Username: {testResults.user.debug.lookupResults.byUsername?.success ? '✅' : '❌'} {testResults.user.debug.lookupResults.byUsername?.error || 'Success'}</div>
                                <div>By Email: {testResults.user.debug.lookupResults.byEmail?.success ? '✅' : '❌'} {testResults.user.debug.lookupResults.byEmail?.error || 'Success'}</div>
                                <div>From All Users: {testResults.user.debug.lookupResults.fromAllUsers?.success ? '✅' : '❌'} {testResults.user.debug.lookupResults.fromAllUsers?.error || 'Success'}</div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Fallback for other success cases
                        <p>✅ Operation completed successfully</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">❌ User Not Found</p>
                      <p>{testResults.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                <p>In your app settings, go to &ldquo;Incoming Webhooks&rdquo; and activate them.</p>
              </div>
              
              <div>
                <h4 className="font-medium">3. Create a Webhook</h4>
                <p>Click &ldquo;Add New Webhook to Workspace&rdquo; and choose the channel where you want to receive notifications.</p>
              </div>
              
              <div>
                <h4 className="font-medium">4. Copy the Webhook URL</h4>
                <p>Copy the generated webhook URL and paste it in the configuration above.</p>
              </div>
              
              <div>
                <h4 className="font-medium">5. Test the Integration</h4>
                <p>Use the &ldquo;Test Connection&rdquo; button to verify everything is working correctly.</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Use @Mentions</h3>
              <div className="space-y-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium">Automatic User Lookup with Autocomplete</h4>
                  <p>The system now automatically looks up users in your Slack workspace when you use @mentions:</p>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Type <code className="bg-blue-100 px-1 rounded">@</code> to see autocomplete suggestions</li>
                    <li>Use arrow keys to navigate through user suggestions</li>
                    <li>Press Enter or click to select a user</li>
                    <li>System finds the user in Slack automatically</li>
                    <li>User gets notified via Slack with @mention</li>
                    <li>No manual configuration needed!</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">Supported Formats</h4>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded">@john.doe</code> - Username</li>
                    <li><code className="bg-blue-100 px-1 rounded">@john.doe@company.com</code> - Full email</li>
                    <li><code className="bg-blue-100 px-1 rounded">@john-doe</code> - With hyphens</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">Example Usage</h4>
                  <p>Comment: <code className="bg-blue-100 px-1 rounded">@john.doe @sarah.smith Can you both review the pricing section?</code></p>
                  <p>Result: Both users get notified in Slack with @mentions</p>
                </div>

                <div>
                  <h4 className="font-medium">Keyboard Navigation</h4>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li><strong>@</strong> - Start typing to see suggestions</li>
                    <li><strong>↑↓</strong> - Navigate through suggestions</li>
                    <li><strong>Enter</strong> - Select highlighted user</li>
                    <li><strong>Escape</strong> - Close suggestions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">Quick Examples</h3>
            <div className="space-y-4 text-sm text-yellow-800">
              <div>
                <h4 className="font-medium">Daily Standup Reminder</h4>
                <p><strong>Message:</strong> &ldquo;Daily standup starting now! Please join the meeting.&rdquo;</p>
                <p><strong>Mentions:</strong> U123456, U789012 (your team members)</p>
                <p><strong>Title:</strong> Daily Standup</p>
              </div>
              
              <div>
                <h4 className="font-medium">Urgent Alert</h4>
                <p><strong>Message:</strong> &ldquo;🚨 URGENT: System maintenance required - Immediate attention needed!&rdquo;</p>
                <p><strong>Mentions:</strong> U123456, U789012, U345678 (all relevant team members)</p>
                <p><strong>Title:</strong> System Alert</p>
                <p><strong>Channel:</strong> #alerts</p>
              </div>
              
              <div>
                <h4 className="font-medium">Meeting Invite</h4>
                <p><strong>Message:</strong> &ldquo;📅 Weekly review meeting starting in 5 minutes\n⏰ Time: 2:00 PM EST\n🔗 Link: [meeting link]&rdquo;</p>
                <p><strong>Mentions:</strong> U123456, U789012 (meeting participants)</p>
                <p><strong>Title:</strong> Meeting Reminder</p>
              </div>
            </div>
          </div>

          {/* Slack User ID Finder */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Slack User ID Finder</h3>
            <div className="space-y-4 text-sm text-green-800">
              <div>
                <h4 className="font-medium">Quick Reference</h4>
                <p>Common Slack user ID formats:</p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li><code className="bg-green-100 px-1 rounded">U1234567890</code> - Standard user ID</li>
                  <li><code className="bg-green-100 px-1 rounded">W1234567890</code> - Workspace user ID</li>
                  <li><code className="bg-green-100 px-1 rounded">U1234567890ABCD</code> - Extended user ID</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Finding Your Own User ID</h4>
                <p>To find your Slack user ID:</p>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Go to your Slack profile</li>
                  <li>Click &ldquo;View profile&rdquo;</li>
                  <li>Click &ldquo;More&rdquo; → &ldquo;Copy member ID&rdquo;</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium">Finding Other User IDs</h4>
                <p>To find another user&apos;s Slack user ID:</p>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Right-click on their name in Slack</li>
                  <li>Select &ldquo;Copy link&rdquo;</li>
                  <li>The user ID is the last part of the URL</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
