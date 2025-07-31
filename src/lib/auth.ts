import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '@/lib/supabase';

// Only check for required environment variables in production runtime
const validateEnvVars = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is required');
    if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET is required');
    if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required');
  }
};

// Check if we have valid Google OAuth credentials
const hasValidGoogleCredentials = () => {
  return process.env.GOOGLE_CLIENT_ID && 
         process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here' &&
         process.env.GOOGLE_CLIENT_SECRET && 
         process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret-here';
};

// Log the callback URL for debugging
const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;

export const authOptions = {
  providers: hasValidGoogleCredentials() ? [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ] : [],
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
  session: {
    strategy: 'jwt' as const,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
  },
  debug: false, // Disable debug to avoid warnings
  callbacks: {
    async signIn({ user }: any) {
      try {
      // Validate environment variables in production
      if (process.env.NODE_ENV === 'production') {
        validateEnvVars();
      }
        
      // Create or update user in the database
      if (user?.email) {
          console.log('Processing sign in for user:', user.email);
          
          // Check if user exists
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error fetching user:', fetchError);
          }

          let dbUser;
          if (existingUser) {
            console.log('Updating existing user:', existingUser.email);
            // Update existing user
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ name: user.name })
              .eq('email', user.email)
              .select()
              .single();
              
            if (updateError) {
              console.error('Error updating user:', updateError);
            } else {
              dbUser = updatedUser;
            }
          } else {
            console.log('Creating new user:', user.email);
            // Create new user
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
            email: user.email,
            name: user.name,
            role: 'user',
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('Error creating user:', insertError);
            } else {
              dbUser = newUser;
            }
          }
          
          if (dbUser) {
        user.role = dbUser.role;
            console.log('User processed successfully:', dbUser.email, 'Role:', dbUser.role);
          }
      }
      return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Still allow sign in even if database operation fails
      }
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.image = token.picture as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user, account }: any) {
      if (account && user) {
        token.id = user.id;
        token.picture = user.image;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async redirect({ url, baseUrl }: any) {
      // Default redirect to dashboard after login
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
}; 