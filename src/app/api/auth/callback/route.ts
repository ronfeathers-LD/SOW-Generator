import { handleCallback } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export const GET = async (req: Request) => {
  try {
    const res = await handleCallback(req);
    return res;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }
}; 