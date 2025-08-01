'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminNav() {
  const { data: session } = useSession();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Only show admin nav if user is admin
  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-indigo-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Admin Panel</span>
          
          {/* Dashboard */}
          <Link 
            href="/admin"
            className="text-sm hover:text-indigo-200 transition-colors"
          >
            Dashboard
          </Link>

          {/* Configuration Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="text-sm hover:text-indigo-200 transition-colors flex items-center"
            >
              Configuration
              <svg 
                className={`ml-1 h-4 w-4 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isConfigOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                <div className="py-1">
                  <Link 
                    href="/admin/salesforce"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsConfigOpen(false)}
                  >
                    Salesforce
                  </Link>
                  <Link 
                    href="/admin/avoma"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsConfigOpen(false)}
                  >
                    Avoma
                  </Link>
                  <Link 
                    href="/admin/gemini"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsConfigOpen(false)}
                  >
                    Gemini AI
                  </Link>
                  <Link 
                    href="/admin/leandata-signatories"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsConfigOpen(false)}
                  >
                    LeanData Signatories
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Management */}
          <Link 
            href="/admin/users"
            className="text-sm hover:text-indigo-200 transition-colors"
          >
            User Management
          </Link>
        </div>
        
        <div className="text-sm">
          Logged in as: {session.user?.name || session.user?.email}
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {isConfigOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsConfigOpen(false)}
        />
      )}
    </div>
  );
} 