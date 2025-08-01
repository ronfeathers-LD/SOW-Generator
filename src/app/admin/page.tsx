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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

        {/* Salesforce Status */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className={`h-6 w-6 ${stats?.salesforceConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Salesforce
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.salesforceConfigured ? 'Connected' : 'Not Configured'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/salesforce" className="font-medium text-indigo-700 hover:text-indigo-900">
                {stats?.salesforceConfigured ? 'Manage' : 'Configure'}
              </Link>
            </div>
          </div>
        </div>

        {/* Avoma Status */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className={`h-6 w-6 ${stats?.avomaConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avoma
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.avomaConfigured ? 'Connected' : 'Not Configured'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/avoma" className="font-medium text-indigo-700 hover:text-indigo-900">
                {stats?.avomaConfigured ? 'Manage' : 'Configure'}
              </Link>
            </div>
          </div>
        </div>

        {/* Gemini AI Status */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className={`h-6 w-6 ${stats?.geminiConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Gemini AI
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.geminiConfigured ? 'Connected' : 'Not Configured'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/admin/gemini" className="font-medium text-indigo-700 hover:text-indigo-900">
                {stats?.geminiConfigured ? 'Manage' : 'Configure'}
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