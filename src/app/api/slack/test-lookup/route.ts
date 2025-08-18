import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // Simple test response
    return NextResponse.json({
      success: true,
      message: `Test lookup for username: ${username}`,
      timestamp: new Date().toISOString(),
      session: {
        user: session.user.email,
        role: session.user.role
      }
    });

  } catch (error) {
    console.error('Error in test lookup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
