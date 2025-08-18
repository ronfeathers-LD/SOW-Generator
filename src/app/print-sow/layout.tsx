'use client';

import React, { useEffect } from 'react'
import { Inter } from 'next/font/google'
import '../globals.css'
import Providers from '../providers'

const inter = Inter({ subsets: ['latin'] })

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add class to body to hide header/footer elements
    document.body.classList.add('print-sow-route');
    
    // Also add some inline styles to ensure hiding works
    document.body.style.setProperty('--print-sow-active', 'true');
    
    return () => {
      // Remove class when component unmounts
      document.body.classList.remove('print-sow-route');
      document.body.style.removeProperty('--print-sow-active');
    };
  }, []);

  return (
    <div className={`${inter.className} print-layout`}>
      <Providers>
        {children}
      </Providers>
    </div>
  );
}
