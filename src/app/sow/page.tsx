'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getStatusColor } from '@/lib/utils/statusUtils';

interface SOW {
  id: string;
  client_name: string;
  sow_title: string;
  start_date: string | Date | null;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
  author?: string; // Add author field
  version?: number;
  is_latest?: boolean;
  parent_id?: string;
  revisions?: SOW[]; // Add revisions for hierarchical display
}

function SOWListContent() {
  const [sows, setSows] = useState<SOW[]>([]);
  const [filteredSows, setFilteredSows] = useState<SOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SOW;
    direction: 'asc' | 'desc';
  } | null>(null);
 
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  // Sorting function
  const handleSort = (key: keyof SOW) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort SOWs based on current sort configuration
  const sortSOWs = useCallback((sowsToSort: SOW[]) => {
    if (!sortConfig) return sowsToSort;

    return [...sowsToSort].sort((a, b) => {
      const aValue: string | number | Date = a[sortConfig.key] as string | number | Date;
      const bValue: string | number | Date = b[sortConfig.key] as string | number | Date;

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [sortConfig]);

  useEffect(() => {
    const fetchSOWs = async () => {
      try {
        const response = await fetch('/api/sow');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error text:', errorText);
          throw new Error(`Failed to fetch SOWs: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        setSows(data);
      } catch (err) {
        console.error('Error fetching SOWs:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSOWs();
  }, []);

  // Group SOWs hierarchically (parent SOWs with their revisions)
  const groupSOWsHierarchically = useCallback((sowsToGroup: SOW[]) => {
    // First, identify root SOWs (those without parent_id)
    const rootSOWs = sowsToGroup.filter(sow => !sow.parent_id);
    
    // Group revisions by their parent_id
    const revisionsByParent = sowsToGroup.reduce((acc, sow) => {
      if (sow.parent_id) {
        if (!acc[sow.parent_id]) {
          acc[sow.parent_id] = [];
        }
        acc[sow.parent_id].push(sow);
      }
      return acc;
    }, {} as Record<string, SOW[]>);
    
    // Create hierarchical structure
    const hierarchicalSOWs: (SOW & { revisions?: SOW[] })[] = [];
    
    rootSOWs.forEach(rootSOW => {
      const revisions = revisionsByParent[rootSOW.id] || [];
      hierarchicalSOWs.push({
        ...rootSOW,
        revisions: revisions.sort((a, b) => (a.version || 1) - (b.version || 1))
      });
    });
    
    return hierarchicalSOWs;
  }, []);

  // Filter and sort SOWs based on status filter and sort config
  useEffect(() => {
    let filtered = sows;
    
    if (statusFilter) {
      filtered = sows.filter(sow => sow.status === statusFilter);
    }
    
    // Apply sorting
    filtered = sortSOWs(filtered);
    
    // Group hierarchically
    const hierarchicalSOWs = groupSOWsHierarchically(filtered);
    
    setFilteredSows(hierarchicalSOWs);
  }, [sows, statusFilter, sortConfig, sortSOWs, groupSOWsHierarchically]);

  // Helper function to render a single SOW row
  const renderSOWRow = (sow: SOW, isRevision: boolean = false) => (
    <tr key={sow.id} className={isRevision ? 'bg-gray-50' : ''}>
      <td className={`py-4 pr-3 text-sm font-medium text-gray-900 ${isRevision ? 'pl-8' : 'pl-4'}`}>
        <div className="flex items-center space-x-2">
          {isRevision && (
            <span className="text-gray-400 text-xs">└─</span>
          )}
          <span>{sow.client_name || 'N/A'}</span>
        </div>
      </td>
      <td className="px-3 py-4 text-sm text-gray-500 break-words">
        <div className="space-y-1">
          <div>{sow.sow_title || 'N/A'}</div>
          {(sow.version && sow.version > 1) && (
            <div className="text-xs text-blue-600 font-medium">
              v{sow.version}
              {sow.is_latest ? ' (Latest)' : ' (Previous)'}
            </div>
          )}
          {isRevision && (
            <div className="text-xs text-gray-400">
              Revision of original SOW
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-4 text-sm text-gray-500">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sow.status)}`}>
          {getStatusLabel(sow.status)}
        </span>
      </td>
      <td className="px-3 py-4 text-sm text-gray-500">
        {(() => {
          try {
            if (sow.created_at) {
              const date = new Date(sow.created_at);
              return (
                <div>
                  <div>{date.toLocaleDateString()}</div>
                  <div>{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              );
            }
            return 'N/A';
          } catch (error) {
            console.error('Error parsing created_at:', error, sow.created_at);
            return 'N/A';
          }
        })()}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500">
        {sow.author || 'N/A'}
      </td>
      <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium">
        <div className="flex justify-end space-x-3">
          {sow.status === 'draft' && (
            <Link
              href={`/sow/${sow.id}/edit`}
              className="text-green-600 hover:text-green-900 p-1"
              title="Edit SOW"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
          )}
          <Link
            href={`/sow/${sow.id}`}
            className="text-indigo-600 hover:text-indigo-900 p-1"
            title="View SOW"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Link>
          {sow.status !== 'approved' && (
            <button
              onClick={() => handleHide(sow.id, sow.sow_title, sow.status)}
              disabled={deletingId === sow.id}
              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed p-1"
              title={sow.status === 'approved' ? 'Approved SOWs cannot be hidden' : 'Hide SOW'}
            >
              {deletingId === sow.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
          {sow.status === 'approved' && (
            <span className="text-gray-400 cursor-not-allowed p-1" title="Approved SOWs cannot be hidden">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          )}
        </div>
      </td>
    </tr>
  );

  const handleHide = async (id: string, sowTitle: string, status: string) => {
    // Enhanced confirmation dialog
    const confirmMessage = `Are you sure you want to hide "${sowTitle}"?\n\n` +
      `Status: ${getStatusLabel(status)}\n` +
      `This action will hide this SOW and all its versions from the system.\n` +
      `The data will be preserved but will no longer be visible.\n\n` +
      `Type "HIDE" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    if (userInput !== 'HIDE') {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/sow/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to hide SOW');
      }

      const result = await response.json();
      
      // Show success message
      alert(`SOW "${sowTitle}" hidden successfully${result.hiddenVersions ? ` along with ${result.hiddenVersions} version(s)` : ''}.`);

      // Remove the hidden SOW from both lists
      setSows(sows.filter(sow => sow.id !== id));
      setFilteredSows(filteredSows.filter(sow => sow.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to hide SOW';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'in_review': return 'In Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };




  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">
              Statements of Work
              {statusFilter && (
                <span className="ml-2 text-lg font-normal text-gray-500">
                  - {getStatusLabel(statusFilter)}
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              {statusFilter 
                ? `Showing ${getStatusLabel(statusFilter)} SOWs`
                : 'A list of all Statements of Work in the system.'
              }
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/sow/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Create New SOW
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/sow"
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !statusFilter 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({sows.length})
          </Link>
          <Link
            href="/sow?status=draft"
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'draft' 
                ? 'bg-gray-100 text-gray-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draft ({sows.filter(sow => sow.status === 'draft').length})
          </Link>
          <Link
            href="/sow?status=in_review"
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'in_review' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Review ({sows.filter(sow => sow.status === 'in_review').length})
          </Link>
          <Link
            href="/sow?status=approved"
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({sows.filter(sow => sow.status === 'approved').length})
          </Link>
          <Link
            href="/sow?status=rejected"
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'rejected' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({sows.filter(sow => sow.status === 'rejected').length})
          </Link>
        </div>

        <div className="mt-8 overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          {/* Sort Status Indicator */}
          {sortConfig && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  Sorted by: <span className="font-medium">{sortConfig.key.replace('_', ' ')}</span> ({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
                </span>
                <button
                  onClick={() => setSortConfig(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear Sort</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="w-1/6 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('client_name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Client Name</span>
                          {sortConfig?.key === 'client_name' && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="w-2/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('sow_title')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Project Name</span>
                          {sortConfig?.key === 'sow_title' && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="w-1/12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {sortConfig?.key === 'status' && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Created</span>
                          {sortConfig?.key === 'created_at' && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="w-1/12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('author')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Author</span>
                          {sortConfig?.key === 'author' && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="w-1/6 relative py-3.5 pl-3 pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredSows && filteredSows.length > 0 ? (
                      filteredSows.map((sow) => (
                        <React.Fragment key={sow.id}>
                          {/* Parent SOW */}
                          {renderSOWRow(sow, false)}
                          {/* Revisions */}
                          {sow.revisions && sow.revisions.map((revision) => 
                            renderSOWRow(revision, true)
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                          {statusFilter ? `No ${getStatusLabel(statusFilter)} SOWs found` : 'No SOWs found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SOWListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <SOWListContent />
    </Suspense>
  );
} 