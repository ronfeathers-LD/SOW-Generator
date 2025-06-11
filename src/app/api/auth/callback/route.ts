import { handleCallback } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const res = await handleCallback(req);
    const session = res.cookies.get('appSession')?.value;
    if (session) {
      // Handle successful authentication
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }
} 