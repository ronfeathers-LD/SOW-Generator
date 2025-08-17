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
      console.warn('SOW stats query error:', sowError);
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackStats, error: fallbackError } = await supabase
          .from('sows')
          .select('status')
          .eq('is_hidden', false);
        
        if (!fallbackError) {
          sowStats = fallbackStats; // Use fallback data
        } else {
          console.warn('SOW stats fallback error:', fallbackError);
        }
      } catch (fallbackError) {
        console.warn('SOW stats fallback exception:', fallbackError);
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
        .select('id, client_name, sow_title, status, created_at, author:users!sows_author_id_fkey(name)')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      recentSOWs = result.data;
      recentError = result.error;
      
    } catch {
      // Error handled by setting recentError to null
    }
    
    if (recentError) {
      console.warn('Recent SOWs query error:', recentError);
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackRecent, error: fallbackError } = await supabase
          .from('sows')
          .select('id, client_name, sow_title, status, created_at, author:users!sows_author_id_fkey(name)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!fallbackError) {
          recentSOWs = fallbackRecent; // Use fallback data
        } else {
          console.warn('Recent SOWs fallback error:', fallbackError);
        }
      } catch (fallbackError) {
        console.warn('Recent SOWs fallback exception:', fallbackError);
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
      console.warn('Pending approvals query error:', approvalError);
    }

    return {
      stats,
      recentSOWs: recentSOWs || [],
      pendingApprovals: pendingApprovals || []
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {session.user.name?.split(' ')[0] || session.user.email?.split('@')[0]}!
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



          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            {/* Consolidated SOW Status Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">SOW Status Overview</h3>
                    <p className="text-sm text-gray-500">Current status of all Statements of Work</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/sow" className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group relative">
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600">{dashboardData.stats.total}</div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-500">Total SOWs</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  <Link href="/sow?status=draft" className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group relative">
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600">{dashboardData.stats.draft}</div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-500">Draft</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  <Link href="/sow?status=in_review" className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group relative">
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600">{dashboardData.stats.in_review}</div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-500">In Review</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  <Link href="/sow?status=approved" className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group relative">
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600">{dashboardData.stats.approved}</div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-500">Approved</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <Link href="/sow?status=rejected" className="text-center p-2 bg-red-50 rounded-lg flex-1 mx-1 hover:bg-red-100 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <div className="text-lg font-bold text-red-600 group-hover:text-red-700">{dashboardData.stats.rejected}</div>
                      <div className="text-xs text-red-500 group-hover:text-red-600">Rejected</div>
                    </Link>
                    <Link
                      href="/sow"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
                    >
                      View all SOWs →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <p className="text-sm text-gray-500">Latest changes and updates</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Recent SOW Updates */}
                  {dashboardData.recentSOWs.slice(0, 3).map((sow: unknown) => {
                    const sowObj = sow as { id: string; sow_title?: string; client_name?: string; status: string; created_at: string; author?: { name: string } };
                    return (
                      <div key={sowObj.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {sowObj.client_name || 'No client'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sowObj.author?.name || 'Unknown author'} • {new Date(sowObj.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sowObj.status)}`}>
                            {getStatusLabel(sowObj.status)}
                          </span>
                          <Link
                            href={`/sow/${sowObj.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{dashboardData.stats.draft}</div>
                      <div className="text-xs text-gray-500">Draft</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{dashboardData.stats.in_review}</div>
                      <div className="text-xs text-gray-500">In Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{dashboardData.stats.approved}</div>
                      <div className="text-xs text-gray-500">Approved</div>
                    </div>
                  </div>
                </div>
              </div>
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

            {/* My Recent SOWs */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">My Recent SOWs</h3>
              </div>
              <div className="p-6">
                {dashboardData.recentSOWs.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentSOWs.slice(0, 3).map((sow: unknown) => {
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
          </div>



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