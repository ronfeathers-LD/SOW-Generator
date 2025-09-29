'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">Signed in as {session.user?.email}</p>
        <button 
          onClick={() => signOut()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Sign out
        </button>
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <button 
        onClick={() => signIn('google')}
        className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50"
        style={{
          backgroundColor: '#2a2a2a',
          color: 'white',
          border: '2px solid #26D07C',
          borderRadius: '12px'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#26D07C';
          (e.target as HTMLButtonElement).style.color = '#2a2a2a';
          (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#2a2a2a';
          (e.target as HTMLButtonElement).style.color = 'white';
          (e.target as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Get Started with Google
      </button>
      <p className="text-sm text-gray-500 mt-4">
        Sign in to access your SOWs and create new ones
      </p>
    </div>
  );
} 