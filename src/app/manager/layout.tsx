import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Manager Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">Manager Portal</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {session.user.name || session.user.email}
              </span>
              <a
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Manager Navigation Menu */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a
              href="/manager/sow-overview"
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              SOW Overview
            </a>
            <a
              href="/manager/team-management"
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Team Management
            </a>
            <a
              href="/manager/reports"
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Reports
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Admin Panel
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
