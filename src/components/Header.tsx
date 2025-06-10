'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export default function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const { user } = session;

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">SOW Generator</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user.image && (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={user.image}
                  alt={user.name || 'User avatar'}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {user.name || 'User'}
              </span>
              <span className="text-xs text-gray-500">
                {user.email || ''}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 