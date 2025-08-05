import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Navigation from './components/Navigation'
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
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="container mx-auto px-4 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
