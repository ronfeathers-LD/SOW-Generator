'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import PMHoursRemovalDashboard from '@/components/sow/PMHoursRemovalDashboard';

export default function PMHoursRemovalAdminPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              PM Hours Removal Management
            </h1>
            <p className="mt-2 text-gray-600">
              Review and manage Project Management hours removal requests.
            </p>
          </div>

          {/* PM Hours Removal Dashboard */}
          <PMHoursRemovalDashboard />
        </div>
      </div>
    </div>
  );
}
