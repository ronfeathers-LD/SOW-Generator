import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStatusColor, getStatusLabel } from '@/lib/utils/statusUtils';
import { Session } from 'next-auth';

async function getDashboardStats(session: Session) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First, get the user's database ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();
    
    if (userError || !userData) {
      return {
        stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0 },
        recentSOWs: [],
        pendingApprovals: []
      };
    }
    
    // const userId = userData.id; // TODO: Use for user-specific filtering in future
    
    // Get SOW counts by status - filter by user access
    let sowStats = null;
    let sowError = null;
    
    try {
      // Get visible SOWs
      const result = await supabase
        .from('sows')
        .select('status')
        .eq('is_hidden', false);
      
      sowStats = result.data;
      sowError = result.error;
      
    } catch (_error) {
      sowError = _error;
    }
    
    if (sowError) {
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackStats, error: fallbackError } = await supabase
          .from('sows')
          .select('status')
          .eq('is_hidden', false);
        
        if (!fallbackError) {
          sowStats = fallbackStats; // Use fallback data
        }
      } catch {
        // Silently handle fallback error
      }
    }

    const stats = {
      total: 0,
      draft: 0,
      in_review: 0,
      approved: 0,
      rejected: 0
    };

    if (sowStats) {
      stats.total = sowStats.length;
      sowStats.forEach((sow: unknown) => {
        const sowObj = sow as { status: string };
        if (stats.hasOwnProperty(sowObj.status)) {
          (stats as Record<string, number>)[sowObj.status]++;
        }
      });
    }

    // Get recent SOWs - filter by user access
    let recentSOWs = null;
    let recentError = null;
    
    try {
      const result = await supabase
        .from('sows')
        .select('id, client_name, sow_title, status, created_at')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      recentSOWs = result.data;
      recentError = result.error;
      
    } catch {
      // Error handled by setting recentError to null
    }
    
    if (recentError) {
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackRecent, error: fallbackError } = await supabase
          .from('sows')
          .select('id, client_name, sow_title, status, created_at')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!fallbackError) {
          recentSOWs = fallbackRecent; // Use fallback data
        }
      } catch {
        // Silently handle fallback error
      }
    }

    // Get pending approvals - filter by user access
    const { data: pendingApprovals, error: approvalError } = await supabase
      .from('sow_approvals')
      .select(`
        id,
        sow_id,
        status,
        stage:approval_stages(name),
        sow:sows(client_name, sow_title)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (approvalError) {
      // Silently handle approval error
    }

    return {
      stats,
      recentSOWs: recentSOWs || [],
      pendingApprovals: pendingApprovals || []
    };
  } catch {
    return {
      stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0 },
      recentSOWs: [],
      pendingApprovals: []
    };
  }
}

export default async function Dashboard() {
  const session = await getServerSession();

  // If user is not authenticated, redirect to home
  if (!session?.user) {
    redirect('/');
  }

  const isAdmin = session.user?.role === 'admin';
  const dashboardData = await getDashboardStats(session);



  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {session.user.name?.split(' ')[0] || session.user.email?.split('@')[0]}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here&apos;s what&apos;s happening with your SOWs today.
            </p>
          </div>



          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Link href="/sow" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total SOWs</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData.stats.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/sow?status=draft" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData.stats.draft}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/sow?status=in_review" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">In Review</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData.stats.in_review}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/sow?status=approved" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData.stats.approved}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/sow?status=rejected" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData.stats.rejected}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {isAdmin && (
                <>
                  <Link
                    href="/admin/approvals"
                    className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-8 h-8 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-lg">Approval Management</h4>
                        <p className="text-purple-200 text-sm">Manage SOW approvals</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin"
                    className="bg-orange-600 text-white p-6 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-8 h-8 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-lg">Admin Panel</h4>
                        <p className="text-orange-200 text-sm">Manage system settings</p>
                      </div>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent SOWs */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent SOWs</h3>
              </div>
              <div className="p-6">
                {dashboardData.recentSOWs.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentSOWs.map((sow: unknown) => {
                      const sowObj = sow as { id: string; sow_title?: string; client_name?: string; status: string };
                      return (
                        <div key={sowObj.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{sowObj.sow_title || 'Untitled SOW'}</h4>
                            <p className="text-sm text-gray-500">{sowObj.client_name || 'No client'}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sowObj.status)}`}>
                              {getStatusLabel(sowObj.status)}
                            </span>
                            <Link
                              href={`/sow/${sowObj.id}`}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              View
                            </Link>
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

            {/* Pending Approvals */}
            {isAdmin && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                </div>
                <div className="p-6">
                  {dashboardData.pendingApprovals.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.pendingApprovals.map((approval: unknown) => {
                        const approvalObj = approval as { 
                          id: string; 
                          sow_id: string; 
                          sow?: { sow_title?: string; client_name?: string }; 
                          stage?: { name: string } 
                        };
                                                return (
                          <div key={approvalObj.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {approvalObj.sow?.sow_title || 'Untitled SOW'}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {approvalObj.sow?.client_name || 'No client'} • {approvalObj.stage?.name}
                              </p>
                            </div>
                            <Link
                              href={`/sow/${approvalObj.sow_id}`}
                              className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                            >
                              Review
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No pending approvals</p>
                  )}
                  <div className="mt-4">
                    <Link
                      href="/admin/approvals"
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View all approvals →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tools (if not admin, show empty state) */}
            {!isAdmin && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Admin Tools</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-500 text-center py-4">
                    Admin tools are only available to administrators.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Configuration Section */}
          {isAdmin && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/salesforce"
                  className="bg-blue-50 border border-blue-200 p-4 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-blue-900 font-medium">Salesforce</span>
                  </div>
                </Link>

                <Link
                  href="/admin/avoma"
                  className="bg-green-50 border border-green-200 p-4 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 01-2-2V8a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-green-900 font-medium">Avoma</span>
                  </div>
                </Link>

                <Link
                  href="/admin/gemini"
                  className="bg-purple-50 border border-purple-200 p-4 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-purple-900 font-medium">Gemini AI</span>
                  </div>
                </Link>

                <Link
                  href="/admin/leandata-signatories"
                  className="bg-orange-50 border border-orange-200 p-4 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-orange-900 font-medium">LeanData Signatories</span>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Logged in as: <span className="font-medium">{session.user.name || session.user.email}</span>
                </p>
                {isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Role: Administrator</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 