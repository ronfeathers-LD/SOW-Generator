import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function ManagerSOWOverviewPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // Check if user is Manager or Admin
  const isManager = session.user.role === 'manager';
  const isAdmin = session.user.role === 'admin';
  
  if (!isManager && !isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SOW Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and monitor SOWs across your team.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Coming Soon</h2>
        <p className="text-gray-600">
          This page will provide managers with an overview of all SOWs, team performance metrics, 
          and project status tracking.
        </p>
      </div>
    </div>
  );
}
