"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const isPMO = session?.user?.role === 'pmo';
  const isLoading = status === 'loading';
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const mobileMenu = document.getElementById('mobile-menu');
      const hamburgerButton = document.getElementById('hamburger-button');
      if (mobileMenu && !mobileMenu.contains(event.target as Node) && 
          hamburgerButton && !hamburgerButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  // Don't show navigation on the home page (login page)
  if (pathname === '/') {
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <nav style={{backgroundColor: '#2a2a2a'}}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Image
                src="https://tlxeqgk0yr1ztnva.public.blob.vercel-storage.com/rte-images/1758909456734-katoxspoked.png"
                alt="LeanData Logo"
                width={80}
                height={40}
                className="h-8 w-auto"
              />
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
      <nav style={{backgroundColor: '#2a2a2a'}}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Image
                src="https://tlxeqgk0yr1ztnva.public.blob.vercel-storage.com/rte-images/1758909456734-katoxspoked.png"
                alt="LeanData Logo"
                width={80}
                height={40}
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center">
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors"
                style={{
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  border: '1px solid #26D07C'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#01eb1d';
                  (e.target as HTMLButtonElement).style.color = '#2a2a2a';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#2a2a2a';
                  (e.target as HTMLButtonElement).style.color = 'white';
                }}
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
    <nav style={{backgroundColor: '#2a2a2a'}}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo on the far left */}
          <div className="flex items-center">
            <Image
              src="https://tlxeqgk0yr1ztnva.public.blob.vercel-storage.com/rte-images/1758909456734-katoxspoked.png"
              alt="LeanData Logo"
              width={80}
              height={40}
              className="h-8 w-auto"
            />
          </div>
          
          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center">
            <div className="flex space-x-8">
              <Link 
                href="/dashboard" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/dashboard' 
                    ? 'border-green-500 text-white font-bold' 
                    : 'border-transparent hover:border-green-200 hover:text-white'
                }`}
                style={{color: 'white'}}
              >
                Dashboard
              </Link>
              <Link 
                href="/sow" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/sow') 
                    ? 'border-green-500 text-white font-bold' 
                    : 'border-transparent hover:border-green-200 hover:text-white'
                }`}
                style={{color: 'white'}}
              >
                SOWs
              </Link>
              <Link 
                href="/change-orders" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/change-orders') 
                    ? 'border-green-500 text-white font-bold' 
                    : 'border-transparent hover:border-green-200 hover:text-white'
                }`}
                style={{color: 'white'}}
              >
                Change Orders
              </Link>
              {/* Tools Dropdown */}
              <div className="relative" ref={toolsDropdownRef}>
                <button
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/pricing-calculator') || pathname.startsWith('/preview-sow')
                      ? 'border-green-500 text-white font-bold' 
                      : 'border-transparent hover:border-green-200 hover:text-white'
                  }`}
                  style={{color: 'white'}}
                >
                  Tools
                  <svg
                    className={`ml-1 w-4 h-4 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Tools Dropdown Menu */}
                {isToolsDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        href="/pricing-calculator"
                        className={`block px-4 py-2 text-sm ${
                          pathname.startsWith('/pricing-calculator')
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsToolsDropdownOpen(false)}
                      >
                        Pricing Calculator
                      </Link>
                      <Link
                        href="/preview-sow"
                        className={`block px-4 py-2 text-sm ${
                          pathname.startsWith('/preview-sow')
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsToolsDropdownOpen(false)}
                      >
                        SOW Preview
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <Link 
                href="/help" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/help') 
                    ? 'border-green-500 text-white font-bold' 
                    : 'border-transparent hover:border-green-200 hover:text-white'
                }`}
                style={{color: 'white'}}
              >
                Help
              </Link>
              {(isPMO || isAdmin) && (
                <Link 
                  href="/pmo" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/pmo') 
                      ? 'border-green-500 text-white font-bold' 
                      : 'border-transparent hover:border-green-200 hover:text-white'
                  }`}
                  style={{color: 'white'}}
                >
                  PMO
                </Link>
              )}
              {isManager && (
                <Link 
                  href="/manager" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/manager') 
                      ? 'border-green-500 text-white font-bold' 
                      : 'border-transparent hover:border-green-200 hover:text-white'
                  }`}
                  style={{color: 'white'}}
                >
                  Manager
                </Link>
              )}
            </div>
          </div>
          
          {/* Desktop User Info - Hidden on mobile */}
          <div className="hidden md:flex items-center">
            {session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  {session.user.image && (
                    <div className="h-6 w-6 rounded-full overflow-hidden ring-1 ring-white/30">
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={24}
                        height={24}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-xs font-medium leading-tight" style={{color: '#26D07C'}}>
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-xs leading-tight" style={{color: '#26D07C'}}>
                      {isAdmin && <div className="leading-none">Administrator</div>}
                      {isManager && <div className="leading-none">Manager</div>}
                      {isPMO && <div className="leading-none">PMO</div>}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`}
                    style={{color: '#26D07C'}}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          signOut();
                          setIsUserDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-20"></div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden flex items-center">
            <button
              id="hamburger-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800">
              <Link
                href="/dashboard"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/dashboard'
                    ? 'text-white bg-gray-900'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/sow"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/sow')
                    ? 'text-white bg-gray-900'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                SOWs
              </Link>
              <Link
                href="/change-orders"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/change-orders')
                    ? 'text-white bg-gray-900'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Change Orders
              </Link>
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Tools
                </div>
                <Link
                  href="/pricing-calculator"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname.startsWith('/pricing-calculator')
                      ? 'text-white bg-gray-900'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing Calculator
                </Link>
                <Link
                  href="/preview-sow"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname.startsWith('/preview-sow')
                      ? 'text-white bg-gray-900'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  SOW Preview
                </Link>
              </div>
              <Link
                href="/help"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/help')
                    ? 'text-white bg-gray-900'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Help
              </Link>
              {(isPMO || isAdmin) && (
                <Link
                  href="/pmo"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname.startsWith('/pmo')
                      ? 'text-white bg-gray-900'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  PMO
                </Link>
              )}
              {isManager && (
                <Link
                  href="/manager"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname.startsWith('/manager')
                      ? 'text-white bg-gray-900'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Manager
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              {session && (
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center px-3 py-2">
                    {session.user.image && (
                      <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-white/30 mr-3">
                        <Image
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-white">
                        {session.user.name || session.user.email}
                      </div>
                      <div className="text-xs text-gray-300">
                        {isAdmin && 'Administrator'}
                        {isManager && 'Manager'}
                        {isPMO && 'PMO'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}