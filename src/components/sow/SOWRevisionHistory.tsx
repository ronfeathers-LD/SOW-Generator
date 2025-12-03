'use client';

import React, { useState, useEffect } from 'react';

interface SOWRevision {
  id: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'recalled';
  created_at: string;
  updated_at: string;
  rejected_at?: string;
  approved_at?: string;
  approval_comments?: string;
  pm_hours_requirement_disabled?: boolean;
  pm_hours_requirement_disabled_date?: string;
  author?: {
    name: string;
    email: string;
  };
  rejected_by?: {
    name: string;
    email: string;
  };
  approved_by?: {
    name: string;
    email: string;
  };
}

interface SOWRevisionHistoryProps {
  sowId: string;
  currentVersion?: number;
}

export default function SOWRevisionHistory({ sowId, currentVersion }: SOWRevisionHistoryProps) {
  const [revisions, setRevisions] = useState<SOWRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const response = await fetch(`/api/sow/${sowId}/revisions`);
        if (response.ok) {
          const data = await response.json();
          setRevisions(data.revisions || []);
        } else {
          setError('Failed to load revision history');
        }
      } catch {
        setError('Error loading revision history');
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, [sowId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'in_review': return 'text-blue-600 bg-blue-100';
      case 'recalled': return 'text-purple-600 bg-purple-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'in_review': return '👀';
      case 'recalled': return '🔁';
      case 'draft': return '📝';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revision History</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revision History</h3>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (revisions.length <= 1) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revision History</h3>
        <p className="text-gray-500">No revision history available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Revision History</h3>
      
      <div className="space-y-4">
        {revisions.map((revision) => (
          <div 
            key={revision.id} 
            className={`border rounded-lg p-4 ${
              revision.version === currentVersion 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getStatusIcon(revision.status)}</span>
                <div>
                  <span className="font-medium">Version {revision.version}</span>
                  {revision.version === currentVersion && (
                    <span className="ml-2 text-sm text-blue-600 font-medium">(Current)</span>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(revision.status)}`}>
                  {revision.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(revision.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Created by:</span>
                <span className="ml-2 text-gray-600">
                  {revision.author?.name || revision.author?.email || 'Unknown'}
                </span>
              </div>

              {revision.status === 'rejected' && revision.rejected_by && (
                <div>
                  <span className="font-medium text-gray-700">Rejected by:</span>
                  <span className="ml-2 text-gray-600">
                    {revision.rejected_by.name || revision.rejected_by.email}
                  </span>
                </div>
              )}

              {revision.status === 'approved' && revision.approved_by && (
                <div>
                  <span className="font-medium text-gray-700">Approved by:</span>
                  <span className="ml-2 text-gray-600">
                    {revision.approved_by.name || revision.approved_by.email}
                  </span>
                </div>
              )}

              {revision.approval_comments && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Comments:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-gray-600">
                    {revision.approval_comments}
                  </div>
                </div>
              )}

              {revision.pm_hours_requirement_disabled && (
                <div className="md:col-span-2">
                  <div className="mt-2 p-2 bg-amber-50 border-l-4 border-amber-400 rounded">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-amber-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-amber-700">
                        <span className="font-medium">PM Hours Removed</span>
                        {revision.pm_hours_requirement_disabled_date && (
                          <span className="ml-1">
                            (removed on {new Date(revision.pm_hours_requirement_disabled_date).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {revision.status === 'rejected' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Rejected on {new Date(revision.rejected_at!).toLocaleDateString()}
                  </span>
                  <a
                    href={`/sow/${revision.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Revision →
                  </a>
                </div>
              </div>
            )}

            {revision.status === 'recalled' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Recalled on {new Date(revision.updated_at).toLocaleDateString()}
                  </span>
                  <a
                    href={`/sow/${revision.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Revision →
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This version was recalled and archived. Continue work on the subsequent draft revision.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
