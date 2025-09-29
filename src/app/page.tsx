import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import LoginButton from '../components/LoginButton';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, check if they need to see help page
  if (session?.user) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: userData } = await supabase
        .from('users')
        .select('has_seen_help_page')
        .eq('email', session.user.email)
        .single();
      
      // If user hasn't seen help page, redirect there first
      if (userData && !userData.has_seen_help_page) {
        redirect('/help');
      }
    } catch (error) {
      console.error('Error checking help page status:', error);
    }
    
    // Otherwise redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3">
                <Image
                  src="/images/leandata-logo.png"
                  alt="LeanData Logo"
                  width={48}
                  height={48}
                  className="h-12 w-auto"
                />
                <div className="h-12 w-px bg-gray-300"></div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-gray-900">SOW Generator</h1>
                </div>
              </div>
            </div>

            {/* Main Headline */}
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Create Professional
              <span className="block" style={{color: '#26D07C'}}>Statements of Work</span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your SOW creation process with our intelligent, Salesforce-integrated platform. 
              Built for sales teams and project managers who need professional documentation fast.
            </p>

            {/* CTA Button */}
            <div className="mb-16">
              <LoginButton />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600 text-sm">Generate professional SOWs in minutes, not hours. Our AI-powered templates get you started instantly.</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Salesforce Integrated</h3>
                <p className="text-gray-600 text-sm">Seamlessly pull opportunity data from Salesforce to populate your SOWs with accurate client information.</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Quality</h3>
                <p className="text-gray-600 text-sm">Create polished, client-ready documents that reflect your company&apos;s professional standards and brand.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
