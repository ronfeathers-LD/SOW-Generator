'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DashboardClientProps {
  stats: {
    total: number;
    draft: number;
    in_review: number;
    approved: number;
    rejected: number;
  };
  recentSOWs: Array<{
    id: string;
    sow_title?: string;
    client_name?: string;
    status: string;
    created_at: string;
    author?: { name: string };
    products?: Array<{ product: { name: string } }>;
  }>;
  pendingApprovals: Array<{
    id: string;
    sow_title?: string;
    client_name?: string;
    status: string;
    created_at: string;
  }>;
}

export default function DashboardClient({ stats, recentSOWs, pendingApprovals }: DashboardClientProps) {
  const [activeTab] = useState<'overview'>('overview');

  // Helper functions for status display
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'in_review':
        return 'In Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back!
            </h1>
            <p className="mt-2 text-gray-600">
              Here&apos;s what&apos;s happening with your SOWs today.
            </p>
          </div>
          <Link
            href="/sow/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New SOW
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              className="py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600"
            >
              Dashboard Overview
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total SOWs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Draft</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">In Review</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.in_review}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Rejected</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {pendingApprovals.slice(0, 3).map((sow) => (
                    <div key={sow.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {sow.client_name || 'No client'}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Created: {new Date(sow.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sow.status)}`}>
                            {getStatusLabel(sow.status)}
                          </span>
                          <Link
                            href={`/sow/${sow.id}`}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    href="/sow"
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View all SOWs →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* My Recent SOWs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">My Recent SOWs</h3>
            </div>
            <div className="p-6">
              {recentSOWs.length > 0 ? (
                <div className="space-y-4">
                  {recentSOWs.slice(0, 3).map((sow) => {
                    // Format the created date
                    const createdDate = sow.created_at ? new Date(sow.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Unknown date';
                    
                    // Extract product names
                    const productNames = sow.products?.map((p: { product: { name: string } }) => p.product?.name).filter(Boolean) || [];
                    
                    return (
                      <div key={sow.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg mb-1">
                              {sow.client_name || 'No client'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Created: {createdDate}
                            </p>
                            {productNames.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {productNames.map((productName: string, index: number) => (
                                  <span 
                                    key={index}
                                    className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {productName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 ml-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sow.status)}`}>
                              {getStatusLabel(sow.status)}
                            </span>
                            <Link
                              href={`/sow/${sow.id}`}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No SOWs found</p>
              )}
              <div className="mt-4">
                <Link
                  href="/sow"
                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  View all SOWs →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
