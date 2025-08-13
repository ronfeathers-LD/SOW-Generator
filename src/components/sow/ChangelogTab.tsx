'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChangelogEntry } from '@/lib/changelog-service';

interface ChangelogTabProps {
  sowId: string;
}

export default function ChangelogTab({ sowId }: ChangelogTabProps) {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    changeType: '',
    fieldName: '',
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState<{
    totalChanges: number;
    changesByType: Record<string, number>;
    changesByUser: Record<string, number>;
    changesByField: Record<string, number>;
    timeline: Array<{
      date: string;
      action: string;
      user: string;
      field: string;
    }>;
  } | null>(null);

  const fetchChangelog = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.changeType) queryParams.append('changeType', filters.changeType);
      if (filters.fieldName) queryParams.append('fieldName', filters.fieldName);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`/api/sow/${sowId}/changelog?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch changelog');
      }
      
      const data = await response.json();
      setChangelog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch changelog');
    } finally {
      setLoading(false);
    }
  }, [sowId, filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/sow/${sowId}/changelog/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [sowId]);

  useEffect(() => {
    fetchChangelog();
    fetchSummary();
  }, [fetchChangelog, fetchSummary]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchChangelog();
  };

  const clearFilters = () => {
    setFilters({
      changeType: '',
      fieldName: '',
      startDate: '',
      endDate: ''
    });
    fetchChangelog();
  };

  const exportChangelog = async () => {
    try {
      const response = await fetch(`/api/sow/${sowId}/changelog/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sow-${sowId}-changelog.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export changelog:', err);
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'field_update':
        return 'bg-blue-100 text-blue-800';
      case 'content_edit':
        return 'bg-green-100 text-green-800';
      case 'status_change':
        return 'bg-purple-100 text-purple-800';
      case 'version_create':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'version_create':
        return '🔄';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading changelog</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Changelog</h2>
          <p className="text-gray-600">Track all changes made to this SOW</p>
        </div>
        <button
          onClick={exportChangelog}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{summary.totalChanges}</div>
            <div className="text-sm text-gray-600">Total Changes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {summary.changesByType['content_edit'] || 0}
            </div>
            <div className="text-sm text-gray-600">Content Edits</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {summary.changesByType['field_update'] || 0}
            </div>
            <div className="text-sm text-gray-600">Field Updates</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {summary.changesByType['status_change'] || 0}
            </div>
            <div className="text-sm text-gray-600">Status Changes</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Type
            </label>
            <select
              value={filters.changeType}
              onChange={(e) => handleFilterChange('changeType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="field_update">Field Updates</option>
              <option value="content_edit">Content Edits</option>
              <option value="status_change">Status Changes</option>
              <option value="version_create">Version Creation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={filters.fieldName}
              onChange={(e) => handleFilterChange('fieldName', e.target.value)}
              placeholder="e.g., client_name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Changelog List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Change History ({changelog.length} entries)
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {changelog.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No changes found for the selected filters.
            </div>
          ) : (
            changelog.map((entry) => (
              <div key={entry.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getActionIcon(entry.action)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getChangeTypeColor(entry.change_type)}`}>
                        {entry.change_type.replace('_', ' ')}
                      </span>
                      {entry.field_name && (
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {entry.field_name.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{entry.diff_summary}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>By: {entry.user?.name || 'Unknown'}</span>
                      <span>Version: {entry.version}</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Show field changes if available */}
                {entry.previous_value && entry.new_value && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-medium text-red-600 mb-1">Previous Value:</div>
                        <div className="text-gray-700 break-words">
                          {entry.previous_value.length > 100 
                            ? `${entry.previous_value.substring(0, 100)}...` 
                            : entry.previous_value}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600 mb-1">New Value:</div>
                        <div className="text-gray-700 break-words">
                          {entry.new_value.length > 100 
                            ? `${entry.new_value.substring(0, 100)}...` 
                            : entry.new_value}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
