import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PMHoursRemovalService } from '@/lib/pm-hours-removal-service';

async function getPendingPMHoursRemovalRequests() {
  try {
    const supabase = await createServerSupabaseClient();
    const requests = await PMHoursRemovalService.getPendingRequests(supabase);
    return requests;
  } catch (error) {
    console.error('Error fetching pending PM hours removal requests:', error);
    return [];
  }
}

async function getSOWsAwaitingPMOApproval() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First, get the Project Management stage ID
    const { data: pmStage } = await supabase
      .from('approval_stages')
      .select('id')
      .eq('name', 'Project Management')
      .eq('is_active', true)
      .single();

    if (!pmStage) {
      return [];
    }

    // Find SOW approvals for Project Management stage with pending status
    const { data: pmApprovals, error } = await supabase
      .from('sow_approvals')
      .select(`
        id,
        sow_id,
        status,
        created_at,
        sow:sows(
          id,
          sow_title,
          client_name,
          status
        )
      `)
      .eq('stage_id', pmStage.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SOWs awaiting PMO approval:', error);
      return [];
    }

    // Normalize potential array/object relationship shape from Supabase
    type SOWSummary = {
      id: string;
      sow_title?: string;
      client_name?: string;
      status?: string;
    };

    const approvals = (pmApprovals || []) as Array<{
      id: string;
      sow_id: string;
      status: string;
      created_at: string;
      sow?: SOWSummary | SOWSummary[] | null;
    }>;

    // Filter to only SOWs in 'in_review' status and transform the data
    return approvals
      .filter((approval) => {
        const sow = Array.isArray(approval.sow) ? approval.sow[0] : approval.sow;
        return sow?.status === 'in_review';
      })
      .map((approval) => {
        const sow = (Array.isArray(approval.sow) ? approval.sow[0] : approval.sow) || ({} as SOWSummary);
        const createdDate = new Date(approval.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          approval_id: approval.id,
          sow_id: approval.sow_id,
          sow_title: sow.sow_title || 'Untitled SOW',
          client_name: sow.client_name || 'Unknown Client',
          created_at: approval.created_at,
          days_waiting: daysDiff
        };
      });
  } catch (error) {
    console.error('Error fetching SOWs awaiting PMO approval:', error);
    return [];
  }
}

export default async function PMOPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // Check if user is PMO or Admin
  const isPMO = session.user.role === 'pmo';
  const isAdmin = session.user.role === 'admin';
  
  
  if (!isPMO && !isAdmin) {
    console.log('Access denied - redirecting to dashboard');
    redirect('/dashboard');
  }

  // Fetch action items
  const [pendingRemovalRequests, sowsAwaitingApproval] = await Promise.all([
    getPendingPMHoursRemovalRequests(),
    getSOWsAwaitingPMOApproval()
  ]);

  const totalActionItems = pendingRemovalRequests.length + sowsAwaitingApproval.length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">PMO Portal</h1>
              <p className="text-gray-600">Project Management Office</p>
            </div>
          </div>
          {totalActionItems > 0 && (
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {totalActionItems} Action {totalActionItems === 1 ? 'Item' : 'Items'}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <p className="text-gray-700">
            Manage Project Management hours removal requests, approve SOWs awaiting PMO review,
            and maintain oversight of project resource allocations.
          </p>
        </div>
      </div>

      {/* Action Items Section - Prominently Displayed */}
      {totalActionItems > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Action Required</h2>
          </div>

          {/* PM Hours Removal Requests */}
          {pendingRemovalRequests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                PM Hours Removal Requests ({pendingRemovalRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingRemovalRequests.slice(0, 5).map((request) => (
                  <div key={request.request_id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/pmo/pm-hours-removal?id=${request.request_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {request.sow_title || 'Untitled SOW'}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {request.client_name || 'Unknown'} | 
                          Requested: {request.current_pm_hours} hours removal | 
                          {request.hours_since_request > 0 ? ` ${request.hours_since_request}h ago` : ' Just now'}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{request.reason}</p>
                        )}
                      </div>
                      <Link
                        href={`/pmo/pm-hours-removal?id=${request.request_id}`}
                        className="ml-4 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {pendingRemovalRequests.length > 5 && (
                <Link
                  href="/pmo/pm-hours-removal"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {pendingRemovalRequests.length} requests →
                </Link>
              )}
            </div>
          )}

          {/* SOWs Awaiting PMO Approval */}
          {sowsAwaitingApproval.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                SOWs Awaiting PMO Approval ({sowsAwaitingApproval.length})
              </h3>
              <div className="space-y-3">
                {sowsAwaitingApproval.slice(0, 5).map((sow) => (
                  <div key={sow.sow_id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/sow/${sow.sow_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {sow.sow_title}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {sow.client_name || 'Unknown'} | 
                          {sow.days_waiting > 0 ? ` Waiting ${sow.days_waiting} day${sow.days_waiting !== 1 ? 's' : ''}` : ' Waiting for approval'}
                        </p>
                      </div>
                      <Link
                        href={`/sow/${sow.sow_id}`}
                        className="ml-4 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {sowsAwaitingApproval.length > 5 && (
                <div className="mt-3">
                  <Link
                    href="/sow?status=in_review"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all SOWs in review →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Show message if no action items */}
      {totalActionItems === 0 && (
        <div className="bg-green-50 border-l-4 border-green-400 shadow rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
              <p className="text-gray-600 mt-1">No pending PM hours removal requests or SOWs awaiting your approval.</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* PM Hours Removal Requests */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">PM Hours Removal</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Review and approve requests to remove Project Management hours from SOWs.
          </p>
          <Link
            href="/pmo/pm-hours-removal"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Requests
          </Link>
        </div>

        {/* Dashboard Link */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Dashboard</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Return to the main dashboard to view SOWs and overall project status.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Admin Panel (if admin) */}
        {isAdmin && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Admin Panel</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Access system administration functions and user management.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Admin Panel
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity or Stats could go here */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">PMO</div>
            <div className="text-sm text-gray-600">Role</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Hours</div>
            <div className="text-sm text-gray-600">Management</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">Approval</div>
            <div className="text-sm text-gray-600">Process</div>
          </div>
        </div>
      </div>
    </div>
  );
}
