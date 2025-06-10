import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is required');
if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET is required');
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required');

// Log the callback URL for debugging
const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
console.log('Callback URL:', callbackUrl);

const handler = NextAuth({
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
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.image = token.picture as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id;
        token.picture = user.image;
        token.email = user.email;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect called with:', { url, baseUrl });
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
});

export { handler as GET, handler as POST }; 