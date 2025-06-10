import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Header from '../../components/Header';

export default async function Dashboard() {
  const session = await getServerSession();

  // If user is not authenticated, redirect to home
  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h2>
            <p className="text-gray-600">
              This is your SOW Generator dashboard. You can start creating your Statement of Work here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 