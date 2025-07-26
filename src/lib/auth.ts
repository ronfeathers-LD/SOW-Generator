import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';

if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is required');
if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET is required');
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required');

// Log the callback URL for debugging
const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
console.log('Callback URL:', callbackUrl);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode temporarily
  callbacks: {
    async signIn({ user }: any) {
      // Create or update user in the database
      if (user?.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name },
          create: {
            email: user.email,
            name: user.name,
            role: 'user',
          },
        });
        user.role = dbUser.role;
      }
      return true;
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
      // Redirect to /sow after login
      if (url.startsWith('/api/auth/signin')) {
        return `${baseUrl}/sow`;
      }
      // Ensure we're using the correct callback URL
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
}; 