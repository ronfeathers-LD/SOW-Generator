'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AdminNav() {
  const { data: session } = useSession();

  // Only show admin nav if user is admin
  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-indigo-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Admin Panel</span>
          <Link 
            href="/admin/salesforce"
            className="text-sm hover:text-indigo-200 transition-colors"
          >
            Salesforce Config
          </Link>
          <Link 
            href="/admin/leandata-signators"
            className="text-sm hover:text-indigo-200 transition-colors"
          >
            LeanData Signators
          </Link>
          <Link 
            href="/admin/avoma"
            className="text-sm hover:text-indigo-200 transition-colors"
          >
            Avoma Config
          </Link>
        </div>
        <div className="text-sm">
          Logged in as: {session.user?.name || session.user?.email}
        </div>
      </div>
    </div>
  );
} 