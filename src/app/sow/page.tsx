'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  clientSOWs?: SOW[]; // Add clientSOWs for client-based grouping
}

function SOWListContent() {
  const { data: session } = useSession();
  const [sows, setSows] = useState<SOW[]>([]);
  const [filteredSows, setFilteredSows] = useState<SOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SOW;
    direction: 'asc' | 'desc';
  } | null>({
    key: 'created_at',
    direction: 'desc'
  });
 
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const showHidden = searchParams.get('show_hidden') === 'true';
  
  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

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

  // Sort grouped SOWs based on current sort configuration
  const sortGroupedSOWs = useCallback((groupedSOWs: (SOW & { clientSOWs?: SOW[] })[]) => {
    if (!sortConfig) return groupedSOWs;

    return [...groupedSOWs].sort((a, b) => {
      // For client_name, sort by the client name
      if (sortConfig.key === 'client_name') {
        const aValue = a.client_name || '';
        const bValue = b.client_name || '';
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // For other fields, sort by the header SOW's value (the latest SOW)
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
        // Build query string based on filters
        const params = new URLSearchParams();
        if (showHidden) {
          params.append('show_hidden', 'true');
        }
        
        const queryString = params.toString();
        const url = queryString ? `/api/sow?${queryString}` : '/api/sow';
        
        const response = await fetch(url);
        
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
  }, [showHidden]);

  // Group SOWs by client name (client-based grouping)
  const groupSOWsByClient = useCallback((sowsToGroup: SOW[]) => {
    // Group SOWs by client_name
    const sowsByClient = sowsToGroup.reduce((acc, sow) => {
      const clientName = sow.client_name || 'Unknown Client';
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(sow);
      return acc;
    }, {} as Record<string, SOW[]>);
    
    // Create client-based structure with sorted SOWs
    const clientGroups: (SOW & { clientSOWs?: SOW[] })[] = [];
    
    Object.entries(sowsByClient).forEach(([clientName, sows]) => {
      // Sort SOWs by version (ascending) and then by created_at (descending)
      const sortedSOWs = sows.sort((a, b) => {
        // First sort by version if available
        if (a.version && b.version) {
          return a.version - b.version;
        }
        // Then by creation date (newest first)
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });
      
      // Find the latest SOW (highest version or most recent)
      const latestSOW = sortedSOWs.reduce((latest, current) => {
        // If current has a higher version, it's the latest
        if (current.version && latest.version && current.version > latest.version) {
          return current;
        }
        // If current is marked as latest, it's the latest
        if (current.is_latest) {
          return current;
        }
        // If latest is marked as latest, keep it
        if (latest.is_latest) {
          return latest;
        }
        // Otherwise, use the most recent by creation date
        const currentDate = new Date(current.created_at).getTime();
        const latestDate = new Date(latest.created_at).getTime();
        return currentDate > latestDate ? current : latest;
      });
      
      // Use the latest SOW as the "header" and attach all SOWs as clientSOWs
      clientGroups.push({
        ...latestSOW,
        client_name: clientName, // Ensure client name is set
        clientSOWs: sortedSOWs
      });
    });
    
    // Sort client groups by client name
    return clientGroups.sort((a, b) => a.client_name.localeCompare(b.client_name));
  }, []);

  // Filter and sort SOWs based on status filter and sort config
  useEffect(() => {
    let filtered = sows;
    
    if (statusFilter) {
      filtered = sows.filter(sow => sow.status === statusFilter);
    }
    
    // Group by client first
    const clientGroupedSOWs = groupSOWsByClient(filtered);
    
    // Apply sorting to the grouped results
    const sortedGroupedSOWs = sortGroupedSOWs(clientGroupedSOWs);
    
    setFilteredSows(sortedGroupedSOWs);
  }, [sows, statusFilter, sortConfig, groupSOWsByClient, sortGroupedSOWs]);

  // Helper function to render a single SOW row
  const renderSOWRow = (sow: SOW, isClientSOW: boolean = false) => (
    <tr key={sow.id} className={isClientSOW ? 'bg-gray-50' : ''}>
      <td className={`py-4 pr-3 text-sm font-medium text-gray-900 ${isClientSOW ? 'pl-8' : 'pl-4'}`}>
        <div className="flex items-center space-x-2">
          {isClientSOW && (
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
          {isClientSOW && (
            <div className="text-xs text-gray-400">
              SOW Version
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
          {/* Hide/Unhide button - only show for non-hidden SOWs */}
          {!showHidden && (sow.status !== 'approved' || isAdmin) && (
            <button
              onClick={() => handleHide(sow.id, sow.sow_title, sow.status)}
              disabled={deletingId === sow.id}
              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed p-1"
              title={sow.status === 'approved' && !isAdmin ? 'Approved SOWs cannot be hidden' : 'Hide SOW'}
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
          {!showHidden && sow.status === 'approved' && !isAdmin && (
            <span className="text-gray-400 cursor-not-allowed p-1" title="Approved SOWs cannot be hidden">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          )}
          {/* Unhide button - only show for hidden SOWs */}
          {showHidden && isAdmin && (
            <button
              onClick={() => handleUnhide(sow.id, sow.sow_title)}
              disabled={deletingId === sow.id}
              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed p-1"
              title="Unhide SOW"
            >
              {deletingId === sow.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
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

  const handleUnhide = async (id: string, sowTitle: string) => {
    // Confirmation dialog for unhiding
    const confirmMessage = `Are you sure you want to unhide "${sowTitle}"?\n\n` +
      `This action will make this SOW visible again in the system.\n\n` +
      `Type "UNHIDE" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    if (userInput !== 'UNHIDE') {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/sow/${id}/unhide`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unhide SOW');
      }

      await response.json();
      
      // Show success message
      alert(`SOW "${sowTitle}" unhidden successfully.`);

      // Remove the unhidden SOW from the hidden list
      setSows(sows.filter(sow => sow.id !== id));
      setFilteredSows(filteredSows.filter(sow => sow.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unhide SOW';
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
              {showHidden && (
                <span className="ml-2 text-lg font-normal text-red-500">
                  - Hidden SOWs
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              {showHidden 
                ? 'A list of hidden Statements of Work (Admin only).'
                : statusFilter 
                  ? `Showing ${getStatusLabel(statusFilter)} SOWs`
                  : 'A list of all Statements of Work in the system.'
              }
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/sow/new"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto transition-colors"
              style={{
                backgroundColor: '#2a2a2a',
                color: 'white',
                border: '1px solid #26D07C'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#01eb1d';
                (e.target as HTMLElement).style.color = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#2a2a2a';
                (e.target as HTMLElement).style.color = 'white';
              }}
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
              !statusFilter && !showHidden
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
          {/* Admin-only Hidden SOWs filter */}
          {isAdmin && (
            <Link
              href="/sow?show_hidden=true"
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                showHidden 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hidden SOWs ({sows.length})
            </Link>
          )}
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
                      filteredSows.map((clientGroup) => (
                        <React.Fragment key={clientGroup.id}>
                          {/* Only show client header if there are multiple SOWs */}
                          {clientGroup.clientSOWs && clientGroup.clientSOWs.length > 1 ? (
                            <>
                              {/* Client Header SOW */}
                              {renderSOWRow(clientGroup, false)}
                              {/* Client SOWs */}
                              {clientGroup.clientSOWs.map((sow) => 
                                renderSOWRow(sow, true)
                              )}
                            </>
                          ) : (
                            /* Single SOW - show it directly without header */
                            clientGroup.clientSOWs && clientGroup.clientSOWs.map((sow) => 
                              renderSOWRow(sow, false)
                            )
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