import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LoginButton from '../components/LoginButton';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-indigo-50 to-white">
      <div className="z-10 max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to SOW Generator</h1>
          <p className="text-xl text-gray-600 mb-8">Your Statement of Work generation tool</p>
          <p className="text-sm text-gray-500 mb-8">Please sign in to access your SOWs and create new ones.</p>
        </div>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </main>
  )
}
