'use client';

import { useEffect, useState } from 'react';

export default function JavaScriptRequired() {
  const [jsEnabled, setJsEnabled] = useState(false);

  useEffect(() => {
    // If this effect runs, JavaScript is enabled
    setJsEnabled(true);
  }, []);

  // If JavaScript is not enabled, show the error message
  if (!jsEnabled) {
    return (
      <div className="fixed inset-0 bg-red-50 flex items-center justify-center z-50">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">
            JavaScript Required
          </h3>
          <p className="text-sm text-red-700 mb-4">
            This application requires JavaScript to function properly. Please enable JavaScript in your browser settings and refresh the page.
          </p>
          <div className="text-xs text-red-600">
            <p className="mb-1"><strong>How to enable JavaScript:</strong></p>
            <ul className="text-left space-y-1">
              <li>• <strong>Chrome:</strong> Settings → Privacy and security → Site Settings → JavaScript</li>
              <li>• <strong>Firefox:</strong> Settings → Privacy & Security → Permissions → JavaScript</li>
              <li>• <strong>Safari:</strong> Preferences → Security → Enable JavaScript</li>
              <li>• <strong>Edge:</strong> Settings → Cookies and site permissions → JavaScript</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // If JavaScript is enabled, don't render anything
  return null;
} 