'use client';

import Link from 'next/link';

interface DashboardClientProps {
  stats: {
    total: number;
    draft: number;
    in_review: number;
    approved: number;
    rejected: number;
    recalled: number;
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
      case 'recalled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
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
      case 'recalled':
        return 'Recalled';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white p-6" style={{border: '1px solid #8F8F8F', borderRadius: '8px'}}>
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
            className="inline-flex items-center px-6 py-3 transition-colors"
            style={{
              backgroundColor: '#2a2a2a',
              color: 'white',
              border: '1px solid #26D07C',
              borderRadius: '8px'
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
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New SOW
          </Link>
        </div>
      </div>

        <div className="space-y-6">
          {/* Stats Strip */}
          <div className="bg-white shadow rounded-lg">
            <div className="flex divide-x divide-gray-200">
              <Link href="/sow" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group rounded-l-lg">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.total}</span>
              </Link>
              <Link href="/sow?status=draft" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Draft</span>
                <span className="text-xl font-bold text-gray-900 group-hover:text-gray-600 transition-colors">{stats.draft}</span>
              </Link>
              <Link href="/sow?status=in_review" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">In Review</span>
                <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.in_review}</span>
              </Link>
              <Link href="/sow?status=approved" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</span>
                <span className="text-xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{stats.approved}</span>
              </Link>
              <Link href="/sow?status=rejected" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rejected</span>
                <span className="text-xl font-bold text-red-600 group-hover:text-red-700 transition-colors">{stats.rejected}</span>
              </Link>
              <Link href="/sow?status=recalled" className="flex-1 flex flex-col items-center py-3 hover:bg-gray-50 transition-colors group rounded-r-lg">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recalled</span>
                <span className="text-xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{stats.recalled}</span>
              </Link>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
