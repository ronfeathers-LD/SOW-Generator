"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';
import Image from 'next/image';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const isPMO = session?.user?.role === 'pmo';
  const isLoading = status === 'loading';

  // Don't show navigation on the home page (login page)
  if (pathname === '/') {
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <nav className="bg-gradient-to-r from-green-400 via-[#2db670] to-green-600 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-pulse bg-white/30 h-4 w-32 rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-white/30 h-8 w-8 rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // If not authenticated, redirect to login
  if (!session) {
    return (
      <nav className="bg-gradient-to-r from-green-400 via-[#2db670] to-green-600 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-white">SOW Generator</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center px-4 py-2 border border-white/30 text-sm font-medium rounded-md shadow-sm text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 backdrop-blur-sm transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gradient-to-r from-green-400 via-[#2db670] to-green-600 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex space-x-8">
              <Link 
                href="/dashboard" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/dashboard' 
                    ? 'border-white text-white' 
                    : 'border-transparent text-green-100 hover:border-green-200 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/sow" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/sow') 
                    ? 'border-white text-white' 
                    : 'border-transparent text-green-100 hover:border-green-200 hover:text-white'
                }`}
              >
                SOWs
              </Link>
              {(isPMO || isAdmin) && (
                <Link 
                  href="/pmo" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/pmo') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-green-100 hover:border-green-200 hover:text-white'
                  }`}
                >
                  PMO
                </Link>
              )}
              {isManager && (
                <Link 
                  href="/manager" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/manager') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-green-100 hover:border-green-200 hover:text-white'
                  }`}
                >
                  Manager
                </Link>
              )}
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/admin') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-green-100 hover:border-green-200 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {session.user.image && (
                <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-white/30">
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">
                  {session.user.name || session.user.email}
                </p>
                <div className="text-xs text-green-100 space-y-1">
                  {isAdmin && <p>Administrator</p>}
                  {isManager && <p>Manager</p>}
                  {isPMO && <p>PMO</p>}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center px-3 py-2 border border-white/30 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 backdrop-blur-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 