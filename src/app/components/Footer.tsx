'use client';


import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-green-400 via-[#2db670] to-green-600 text-white shadow-lg mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">SOW Generator</h3>
                <p className="text-sm text-green-100">Professional Statement of Work Creation</p>
              </div>
            </div>
            <p className="text-green-100 text-sm leading-relaxed">
              Streamline your Statement of Work creation process with our intelligent, 
              Salesforce-integrated platform. Built for sales teams and project managers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-green-100 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/sow" className="text-green-100 hover:text-white transition-colors text-sm">
                  View SOWs
                </Link>
              </li>
              <li>
                <Link href="/sow/new" className="text-green-100 hover:text-white transition-colors text-sm">
                  Create New SOW
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:ron.feathers@leandata.com?subject=SOW%20Generator%20Support" 
                  className="text-green-100 hover:text-white transition-colors text-sm"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a 
                  href="mailto:ron.feathers@leandata.com?subject=SOW%20Generator%20Bug" 
                  className="text-green-100 hover:text-white transition-colors text-sm"
                >
                  Report Bug
                </a>
              </li>
              <li>
                <span className="text-green-100 text-sm">
                  Version: Alpha
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-6 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-green-100 text-sm">
              © {currentYear} LeanData. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-green-100 text-xs">
                Built with Next.js & Supabase
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
