'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ApiStatus {
  salesforceConfigured: boolean;
  avomaConfigured: boolean;
  geminiConfigured: boolean;
  leanDataSignatories: number;
}

export default function ApiConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user?.isAdmin) {
      router.push('/');
      return;
    }

    fetchApiStatus();
  }, [session, status, router]);

  const fetchApiStatus = async () => {
    try {
      const response = await fetch('/api/admin/status');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data);
      }
    } catch (error) {
      console.error('Error fetching API status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API configuration...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Configuration</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your third-party API integrations and configurations
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Status Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">API Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Salesforce */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className={`h-8 w-8 ${apiStatus?.salesforceConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">Salesforce</h3>
                    <p className="text-sm text-gray-500">CRM Integration</p>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      apiStatus?.salesforceConfigured 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {apiStatus?.salesforceConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/salesforce"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {apiStatus?.salesforceConfigured ? 'Manage' : 'Configure'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Avoma */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className={`h-8 w-8 ${apiStatus?.avomaConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">Avoma</h3>
                    <p className="text-sm text-gray-500">Meeting Intelligence</p>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      apiStatus?.avomaConfigured 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {apiStatus?.avomaConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/avoma"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {apiStatus?.avomaConfigured ? 'Manage' : 'Configure'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Gemini AI */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className={`h-8 w-8 ${apiStatus?.geminiConfigured ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">Gemini AI</h3>
                    <p className="text-sm text-gray-500">AI Content Generation</p>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      apiStatus?.geminiConfigured 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {apiStatus?.geminiConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/gemini"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {apiStatus?.geminiConfigured ? 'Manage' : 'Configure'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Configuration Options */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LeanData Signatories */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">LeanData Signatories</h3>
                    <p className="text-sm text-gray-500">Manage approval workflows</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {apiStatus?.leanDataSignatories || 0} signatories configured
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/leandata-signatories"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Templates */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">Content Templates</h3>
                    <p className="text-sm text-gray-500">SOW content management</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/sow-content-templates"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/salesforce/test"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              Test Salesforce Connection
            </Link>
            <Link
              href="/admin/avoma/test"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              Test Avoma Connection
            </Link>
            <Link
              href="/admin/gemini/test"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              Test Gemini AI Connection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
