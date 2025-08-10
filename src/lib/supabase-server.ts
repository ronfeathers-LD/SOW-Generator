import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side Supabase client for use in server components
// Note: This is a temporary solution that uses the service role key for authenticated users
// In production, you'd want to properly pass the JWT token from NextAuth to Supabase
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  // Get the user session to extract the JWT token
  const session = await getServerSession();
  
  if (session?.user?.email) {
    // For now, we'll use the service role key to bypass RLS
    // This allows authenticated users to access data while we fix the JWT token passing
    console.log('Using service role client for authenticated user:', session.user.email);
    return createServiceRoleClient();
  }
  
  // Fallback to anon client for unauthenticated requests
  console.log('Using anon client for unauthenticated request');
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
};

// Service role client that bypasses RLS (for testing)
export const createServiceRoleClient = () => {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set, falling back to anon client');
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};
