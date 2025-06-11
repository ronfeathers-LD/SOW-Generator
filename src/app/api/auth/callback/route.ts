import { handleAuth } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const res = await handleAuth(req);
    const session = res.cookies.get('appSession')?.value;
    if (session) {
      const user = JSON.parse(Buffer.from(session, 'base64').toString());
      // Create or update user in the database
      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name },
        create: {
          email: user.email,
          name: user.name,
          role: 'user', // Default role
        },
      });
    }
    return res;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
} 