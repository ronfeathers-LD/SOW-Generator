'use client';

import { useSession } from 'next-auth/react';
import { signIn, signOut } from 'next-auth/react';

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Session Status</h2>
          <p>Status: {status}</p>
          <p>Session: {JSON.stringify(session, null, 2)}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <p>NEXTAUTH_URL: {process.env.NEXTAUTH_URL || 'Not set'}</p>
          <p>NEXTAUTH_SECRET: {process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set'}</p>
          <p>GOOGLE_CLIENT_ID: {process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}</p>
          <p>GOOGLE_CLIENT_SECRET: {process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Actions</h2>
          {session ? (
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 