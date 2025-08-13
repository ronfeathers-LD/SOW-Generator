'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ChangelogEntry {
  id: string;
  sow_id: string;
  user_id: string;
  change_type: 'created' | 'updated' | 'deleted';
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_summary: string;
  created_at: string;
  sow_title?: string;
  client_name?: string;
  user_name?: string;
}

interface SOW {
  id: string;
  sow_title: string;
  client_name: string;
}

export default function AdminChangelogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [sows, setSows] = useState<SOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSOW, setSelectedSOW] = useState<string>('all');
  const [changeType, setChangeType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    // Check if user is admin (you may need to adjust this based on your auth setup)
    if (session.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch SOWs for filter dropdown
  useEffect(() => {
    const fetchSOWs = async () => {
      try {
        const response = await fetch('/api/sow');
        if (response.ok) {
          const data = await response.json();
          setSows(data);
        }
      } catch (error) {
        console.error('Error fetching SOWs:', error);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchSOWs();
    }
  }, [session]);

  // Fetch changelog data
  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = '/api/admin/changelog';
        const params = new URLSearchParams();
        
        if (selectedSOW !== 'all') {
          params.append('sow_id', selectedSOW);
        }
        if (changeType !== 'all') {
          params.append('change_type', changeType);
        }
        if (dateRange !== 'all') {
          params.append('date_range', dateRange);
        }

        if (params.toString()) {
          url += '?' + params.toString();
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch changelog');
        }

        const data = await response.json();
        setChangelog(data);
      } catch (error) {
        console.error('Error fetching changelog:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch changelog');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchChangelog();
    }
  }, [session, selectedSOW, changeType, dateRange]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'version_create':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportChangelog = () => {
    const csvContent = [
      ['Date', 'SOW', 'Client', 'Change Type', 'Field', 'Old Value', 'New Value', 'Summary', 'User'],
      ...changelog.map(entry => [
        formatDate(entry.created_at),
        entry.sow_title || 'N/A',
        entry.client_name || 'N/A',
        entry.change_type,
        entry.field_name,
        entry.old_value || '',
        entry.new_value || '',
        entry.change_summary,
        entry.user_name || 'N/A'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SOW Changelog</h1>
          <p className="mt-2 text-gray-600">
            Track all changes made to Statements of Work across the system
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="sow-filter" className="block text-sm font-medium text-gray-700 mb-2">
                SOW
              </label>
              <select
                id="sow-filter"
                value={selectedSOW}
                onChange={(e) => setSelectedSOW(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All SOWs</option>
                {sows.map((sow) => (
                  <option key={sow.id} value={sow.id}>
                    {sow.sow_title} - {sow.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="change-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Change Type
              </label>
              <select
                id="change-type-filter"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Changes</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
                <option value="version_create">Version Created</option>
              </select>
            </div>

            <div>
              <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                id="date-range-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportChangelog}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Changelog Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Changelog Entries ({changelog.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading changelog...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : changelog.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No changelog entries found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SOW
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changelog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.sow_title || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.client_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChangeTypeColor(entry.change_type)}`}>
                          {entry.change_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.field_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {entry.old_value || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {entry.new_value || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        {entry.change_summary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.user_name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
