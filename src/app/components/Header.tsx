"use client";

export default function Header() {
  return (
    <header style={{backgroundColor: '#2a2a2a'}}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Empty space for balance */}
          <div className="w-20"></div>
          
          {/* Beta Announcement - Centered */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2" style={{borderColor: '#26D07C', backgroundColor: 'rgba(38, 208, 124, 0.1)'}}>
              <div className="animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{color: '#26D07C'}}>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <span className="font-semibold text-sm" style={{color: '#26D07C'}}>⚠️ BETA TESTING VERSION</span>
                <span className="block text-xs opacity-90" style={{color: '#26D07C'}}>This application is in development and testing. DO NOT use for production purposes.</span>
              </div>
              <div className="animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{color: '#26D07C'}}>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Empty space for balance */}
          <div className="w-20"></div>
        </div>
      </div>
    </header>
  );
}
