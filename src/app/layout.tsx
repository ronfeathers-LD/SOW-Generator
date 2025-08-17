import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import JavaScriptRequired from './components/JavaScriptRequired'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SOW Generator',
  description: 'Statement of Work Generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <noscript>
          <style>{`
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .js-error { 
              background: #fef2f2; 
              border: 1px solid #fecaca; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px auto; 
              max-width: 600px; 
              text-align: center; 
            }
            .js-error h1 { color: #dc2626; margin-bottom: 10px; }
            .js-error p { color: #7f1d1d; margin-bottom: 15px; }
            .js-error ul { text-align: left; display: inline-block; }
          `}</style>
          <div className="js-error">
            <h1>⚠️ JavaScript Required</h1>
            <p>This application requires JavaScript to function properly. Please enable JavaScript in your browser settings and refresh the page.</p>
            <p><strong>How to enable JavaScript:</strong></p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Site Settings → JavaScript</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Permissions → JavaScript</li>
              <li><strong>Safari:</strong> Preferences → Security → Enable JavaScript</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → JavaScript</li>
            </ul>
          </div>
        </noscript>
      </head>
      <body className={inter.className}>
        <Providers>
          <JavaScriptRequired />
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation />
            
            {/* ALPHA Testing Banner - Temporarily Hidden */}
            {/* <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white py-3 px-4 shadow-lg">
              <div className="container mx-auto flex items-center justify-center space-x-3">
                <div className="animate-pulse">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-center">
                  <span className="font-bold text-lg">⚠️ ALPHA TESTING VERSION</span>
                  <span className="block text-sm opacity-90">This application is in development and testing. DO NOT use for production purposes.</span>
                  <span className="block text-sm mt-1">
                    Send bugs to{' '}
                    <a 
                      href="mailto:ron.feathers@leandata.com?subject=SOW%20Generator%20Bug" 
                      className="underline hover:no-underline font-medium"
                      title="Report a bug"
                    >
                      ron.feathers@leandata.com
                    </a>
                  </span>
                </div>
                <div className="animate-pulse">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM12zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div> */}
            
            <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
            
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
