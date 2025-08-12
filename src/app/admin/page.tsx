'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalSOWs: number;
  activeSOWs: number;
  salesforceConfigured: boolean;
  avomaConfigured: boolean;
  geminiConfigured: boolean;
  leanDataSignatories: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Fetch system status from the dedicated endpoint
      const response = await fetch('/api/admin/status');
      
      if (response.ok) {
        const status = await response.json();
        setStats({
          totalSOWs: status.totalSOWs || 0,
          activeSOWs: status.activeSOWs || 0,
          salesforceConfigured: status.salesforceConfigured || false,
          avomaConfigured: status.avomaConfigured || false,
          geminiConfigured: status.geminiConfigured || false,
          leanDataSignatories: status.leanDataSignatories || 0,
        });
      } else {
        throw new Error('Failed to fetch system status');
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Fallback to default values if API calls fail
      setStats({
        totalSOWs: 0,
        activeSOWs: 0,
        salesforceConfigured: false,
        avomaConfigured: false,
        geminiConfigured: false,
        leanDataSignatories: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your SOW Generator system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total SOWs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total SOWs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalSOWs || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/sow" className="font-medium text-indigo-700 hover:text-indigo-900">
                View all SOWs
              </Link>
            </div>
          </div>
        </div>

        {/* Active SOWs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active SOWs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.activeSOWs || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/sow" className="font-medium text-indigo-700 hover:text-indigo-900">
                View active SOWs
              </Link>
            </div>
          </div>
        </div>

        {/* API Status - Consolidated */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    API Status
                  </dt>
                  <dd className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Salesforce</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stats?.salesforceConfigured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {stats?.salesforceConfigured ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avoma</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stats?.avomaConfigured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {stats?.avomaConfigured ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Gemini AI</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stats?.geminiConfigured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {stats?.geminiConfigured ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/api-config" className="font-medium text-indigo-700 hover:text-indigo-900">
                Manage APIs
              </Link>
            </div>
          </div>
        </div>

        {/* LeanData Signatories */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    LeanData Signatories
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.leanDataSignatories || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/leandata-signatories" className="font-medium text-indigo-700 hover:text-indigo-900">
                Manage Signatories
              </Link>
            </div>
          </div>
        </div>

        {/* Content Templates */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Content Templates
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Manage
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/sow-content-templates" className="font-medium text-indigo-700 hover:text-indigo-900">
                Manage Templates
              </Link>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    User Management
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Manage
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/users" className="font-medium text-indigo-700 hover:text-indigo-900">
                Manage Users
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/sow/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-8 w-8 text-indigo-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Create New SOW</h4>
                <p className="text-sm text-gray-500">Start a new statement of work</p>
              </div>
            </Link>

            <Link
              href="/sow"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-8 w-8 text-green-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-gray-900">View All SOWs</h4>
                <p className="text-sm text-gray-500">Browse and manage existing SOWs</p>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-8 w-8 text-blue-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Main Dashboard</h4>
                <p className="text-sm text-gray-500">Return to main application dashboard</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 