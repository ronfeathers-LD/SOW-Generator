import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await getServerSession();

  // If user is not authenticated, redirect to home
  if (!session?.user) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        <p className="text-xl">Welcome, {session.user.name || 'User'}!</p>
        <p className="mt-4">This is your SOW Generator dashboard.</p>
      </div>
    </main>
  );
} 