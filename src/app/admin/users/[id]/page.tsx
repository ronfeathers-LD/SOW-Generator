'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  slack_user_id?: string;
  slack_username?: string;
  slack_mapping_updated_at?: string;
}

interface UserStats {
  sows_created: number;
  sows_edited: number;
  comments_posted: number;
  approval_comments: number;
  last_activity: string;
  total_sessions: number;
}

interface SlackMapping {
  slack_user_id?: string;
  slack_username?: string;
  slack_mapping_updated_at?: string;
  mapping_status: 'complete' | 'partial' | 'none';
}



export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [slackMapping, setSlackMapping] = useState<SlackMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slackUserIdInput, setSlackUserIdInput] = useState('');
  const [slackUsernameInput, setSlackUsernameInput] = useState('');
  const [autoMapping, setAutoMapping] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userResponse = await fetch(`/api/admin/users/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }
      const userData = await userResponse.json();
      setUser(userData);

      // Fetch user statistics
      const statsResponse = await fetch(`/api/admin/users/${userId}/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUserStats(statsData);
      }

      // Fetch Slack mapping info
      const mappingResponse = await fetch(`/api/admin/users/${userId}/slack-mapping`);
      if (mappingResponse.ok) {
        const mappingData = await mappingResponse.json();
        setSlackMapping(mappingData);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    if (session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchUserData();
  }, [session, status, router, userId, fetchUserData]);



  const updateUserRole = async (newRole: string) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSuccess(`Successfully updated ${updatedUser.name}'s role to ${newRole}`);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };



  const clearSlackInputs = () => {
    setSlackUserIdInput('');
    setSlackUsernameInput('');
  };

  const autoMapSlackUser = async () => {
    if (!user) {
      setError('User data not available');
      return;
    }

    try {
      setAutoMapping(true);
      setShowLoadingModal(true);
      setError(null);
      setSuccess(null);
      
      // Call the Slack mapping service to find user by email
      const response = await fetch(`/api/admin/slack/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'map-user',
          email: user.email 
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Could not parse error response as JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Successfully mapped ${user.name || user.email} to Slack user @${result.mapping.slack_username}`);
        // Update the local state instead of refreshing the entire page
        if (slackMapping) {
          setSlackMapping({
            ...slackMapping,
            slack_user_id: result.mapping.slack_user_id,
            slack_username: result.mapping.slack_username,
            slack_mapping_updated_at: new Date().toISOString(),
            mapping_status: 'complete'
          });
        }
      } else {
        setError(result.error || 'No matching Slack user found');
      }
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error auto-mapping Slack user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto-map Slack user';
      setError(`Auto-mapping failed: ${errorMessage}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setAutoMapping(false);
      setShowLoadingModal(false);
    }
  };

  const updateSlackMapping = async (slackUserId: string, slackUsername: string) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/users/${userId}/slack-mapping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slack_user_id: slackUserId, slack_username: slackUsername }),
      });

      if (!response.ok) {
        throw new Error('Failed to update Slack mapping');
      }

      const updatedMapping = await response.json();
      setSlackMapping(updatedMapping);
      setSuccess('Slack mapping updated successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating Slack mapping:', error);
      setError('Failed to update Slack mapping');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMappingStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'none':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-800">Error Loading User</h3>
            <p className="mt-2 text-red-700">{error}</p>
            <div className="mt-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-yellow-800">User Not Found</h3>
            <p className="mt-2 text-yellow-700">The requested user could not be found.</p>
            <div className="mt-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-700 transition-colors duration-200">
                      Admin
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <Link href="/admin/users" className="text-gray-500 hover:text-gray-700 transition-colors duration-200">
                      Users
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900 font-medium">{user.name || user.email}</span>
                  </li>
                </ol>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                User Profile: {user.name || user.email}
              </h1>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Users
            </Link>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Information Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Role Update Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Update Role</h3>
                <div className="flex items-center space-x-3">
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(e.target.value)}
                    disabled={updating}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  {updating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Slack Mapping Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Slack Integration</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Slack User ID</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {slackMapping?.slack_user_id || 'Not mapped'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Slack Username</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {slackMapping?.slack_username ? `@${slackMapping.slack_username}` : 'Not mapped'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mapping Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMappingStatusColor(slackMapping?.mapping_status || 'none')}`}>
                      {slackMapping?.mapping_status || 'none'}
                    </span>
                  </div>
                </div>

                {slackMapping?.slack_mapping_updated_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(slackMapping.slack_mapping_updated_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Automatic Email-Based Slack Mapping */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Slack Mapping</h3>
                  
                  {/* Current Status */}
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>User Email:</strong> {user.email}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Current Mapping:</strong> {
                            slackMapping?.slack_user_id && slackMapping?.slack_username 
                              ? `@${slackMapping.slack_username} (${slackMapping.slack_user_id})`
                              : 'Not mapped'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMappingStatusColor(slackMapping?.mapping_status || 'none')}`}>
                          {slackMapping?.mapping_status || 'none'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Map Button */}
                  <div className="mb-4">
                    <button
                      onClick={autoMapSlackUser}
                      disabled={updating || autoMapping}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {autoMapping ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Finding Slack User...
                        </>
                      ) : (
                        <>
                          🔍 Find Slack User by Email
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Automatically finds and maps the Slack user with email: {user.email}
                    </p>
                  </div>

                  {/* Manual Override Section */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      <span className="group-open:hidden">🔧 Manual Override</span>
                      <span className="hidden group-open:inline">🔧 Manual Override</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-3">
                        Use this only if the automatic mapping doesn&apos;t work or you need to map to a different Slack user.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Slack User ID (e.g., U1234567890)"
                          value={slackUserIdInput}
                          onChange={(e) => setSlackUserIdInput(e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Slack Username (e.g., john.doe)"
                          value={slackUsernameInput}
                          onChange={(e) => setSlackUsernameInput(e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => {
                            if (slackUserIdInput && slackUsernameInput) {
                              updateSlackMapping(slackUserIdInput, slackUsernameInput);
                            } else {
                              setError('Please fill in both Slack User ID and Username');
                              setTimeout(() => setError(null), 3000);
                            }
                          }}
                          disabled={updating || !slackUserIdInput || !slackUsernameInput}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {updating ? 'Updating...' : 'Update Mapping'}
                        </button>
                        
                        <button
                          onClick={clearSlackInputs}
                          disabled={updating}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* App Usage Statistics Card */}
            {userStats && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">App Usage Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{userStats.sows_created}</div>
                    <div className="text-sm text-gray-500">SOWs Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{userStats.sows_edited}</div>
                    <div className="text-sm text-gray-500">SOWs Edited</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userStats.comments_posted}</div>
                    <div className="text-sm text-gray-500">Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{userStats.approval_comments}</div>
                    <div className="text-sm text-gray-500">Approval Comments</div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userStats.last_activity ? new Date(userStats.last_activity).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Sessions</label>
                      <p className="mt-1 text-sm text-gray-900">{userStats.total_sessions}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (user.email) {
                      navigator.clipboard.writeText(user.email);
                      setSuccess('Email copied to clipboard');
                      setTimeout(() => setSuccess(null), 2000);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  📋 Copy Email
                </button>
                
                <button
                  onClick={() => {
                    if (slackMapping?.slack_username) {
                      navigator.clipboard.writeText(`@${slackMapping.slack_username}`);
                      setSuccess('Slack username copied to clipboard');
                      setTimeout(() => setSuccess(null), 2000);
                    }
                  }}
                  disabled={!slackMapping?.slack_username}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📋 Copy Slack Username
                </button>

                <Link
                  href={`/admin/users/${userId}/activity`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  📊 View Activity Log
                </Link>

                <Link
                  href={`/admin/users/${userId}/sows`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  📄 View SOWs
                </Link>
              </div>
            </div>

            {/* Slack Integration Status */}
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">@Mentions Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Can be @mentioned:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    slackMapping?.mapping_status === 'complete' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {slackMapping?.mapping_status === 'complete' ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Slack notifications:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    slackMapping?.slack_user_id 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {slackMapping?.slack_user_id ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {slackMapping?.mapping_status !== 'complete' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      ⚠️ This user cannot be @mentioned until Slack mapping is complete.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modal for Slack Mapping */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Finding Slack User
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Searching for Slack user with email: <strong>{user?.email}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take a few seconds...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
