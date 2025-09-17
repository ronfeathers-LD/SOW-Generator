
import GoogleProvider from 'next-auth/providers/google';
import { createServiceRoleClient } from '@/lib/supabase-server';
import type { NextAuthOptions } from 'next-auth';
import { logger } from './utils/logger';

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

export const authOptions: NextAuthOptions = {
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
    maxAge: 60 * 60 * 1, // 1 hour in seconds
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
    maxAge: 60 * 60 * 1, // 1 hour in seconds
  },
  debug: false, // Disable debug to avoid warnings
  callbacks: {
    async signIn({ user }) {
      try {
        // Validate environment variables in production
        if (process.env.NODE_ENV === 'production') {
          validateEnvVars();
        }
        
        // Create or update user in the database
        if (user?.email) {
          logger.log('Processing sign in for user:', user.email);
          
          let dbUser;
          
          // Use service role client for user operations
          const supabaseServer = createServiceRoleClient();
          
          const { data: existingUser, error: fetchError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error fetching user:', fetchError);
          }

          if (existingUser) {
            logger.log('Updating existing user:', existingUser.email);
            // Update existing user
            const { data: updatedUser, error: updateError } = await supabaseServer
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
            logger.log('Creating new user:', user.email);
            // Create new user
            const { data: newUser, error: insertError } = await supabaseServer
              .from('users')
              .insert({
                email: user.email,
                name: user.name,
                role: 'user',
                has_seen_help_page: false, // New users haven't seen help page yet
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
            logger.log('User processed successfully:', dbUser.email, 'Role:', dbUser.role);
            
            // Automatically map user to Slack if bot token is configured
            try {
              const { SlackUserMappingService } = await import('./slack-user-mapping-service');
              
              // Get Slack bot token from database or environment
              let botToken = process.env.SLACK_BOT_TOKEN;
              if (!botToken) {
                const { data: slackConfig } = await supabaseServer
                  .from('slack_config')
                  .select('bot_token')
                  .order('id', { ascending: false })
                  .limit(1)
                  .single();
                botToken = slackConfig?.bot_token;
              }
              
              if (botToken) {
                SlackUserMappingService.initialize(botToken);
                const mappingResult = await SlackUserMappingService.mapUserAtLogin(dbUser.email);
                if (mappingResult) {
                  logger.log('Successfully mapped user to Slack:', dbUser.email);
                } else {
                  logger.log('No Slack mapping found for user:', dbUser.email);
                }
              } else {
                logger.log('Slack bot token not configured, skipping user mapping for:', dbUser.email);
              }
            } catch (slackError) {
              // Don't fail authentication if Slack mapping fails
              console.warn('Failed to map user to Slack during login:', slackError);
            }
          }
        }
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Still allow sign in even if database operation fails
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.image = token.picture as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        
        // If role is still missing, fetch it directly from database
        if (!session.user.role && session.user.email) {
          try {
            // Use Supabase
            const supabaseServer = createServiceRoleClient();
            const { data: dbUser, error } = await supabaseServer
              .from('users')
              .select('role')
              .eq('email', session.user.email)
              .single();
            
            if (!error && dbUser) {
              session.user.role = dbUser.role;
              // Also update the token for future use
              token.role = dbUser.role;
            }
          } catch (error) {
            console.error('Error fetching user role in session callback:', error);
          }
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        // Initial sign in - set all user data
        token.id = user.id;
        token.picture = user.image;
        token.email = user.email;
        token.role = user.role;
      }
      
      // Ensure role persists across token refreshes and is always available
      if (!token.role && token.email) {
        // Fetch user role from database if not in token
        try {
          // Use service role client for user operations
          const supabaseServer = createServiceRoleClient();
          const { data: dbUser, error } = await supabaseServer
            .from('users')
            .select('role')
            .eq('email', token.email)
            .single();
          
          if (!error && dbUser) {
            token.role = dbUser.role;
            console.log('JWT callback: Fetched role from DB:', dbUser.role, 'for user:', token.email);
          }
        } catch (error) {
          console.error('Error fetching user role in JWT callback:', error);
        }
      }
      
      // Debug logging removed for cleaner output
      
      return token;
    },
    async redirect({ baseUrl }: { url?: string; baseUrl: string }) {
      // Default redirect to dashboard after login
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
}; 