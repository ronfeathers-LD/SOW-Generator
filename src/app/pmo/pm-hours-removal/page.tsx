import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import PMHoursRemovalDashboard from '@/components/sow/PMHoursRemovalDashboard';
import { authOptions } from '@/lib/auth';

export default async function PMOHoursRemovalPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // Check if user is PMO or Admin
  const isPMO = session.user.role === 'pmo';
  const isAdmin = session.user.role === 'admin';
  
  if (!isPMO && !isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PM Hours Removal Requests</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and approve/reject requests to disable PM hours requirements for SOWs.
        </p>
      </div>

      <PMHoursRemovalDashboard />
    </div>
  );
}
