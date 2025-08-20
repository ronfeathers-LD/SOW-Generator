import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {

  
  try {
    // Check if we can get the session
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log('📋 Session check:', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        userRole: session?.user?.role 
      });
    } catch (sessionError) {
      console.error('💥 Session error:', sessionError);
      return NextResponse.json({ error: 'Session error' }, { status: 500 });
    }
    
    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      console.log('❌ User is not admin:', session.user.role);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');


    if (!username) {
      console.log('❌ No username provided');
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // For now, return a simple test response to verify the endpoint works
    console.log('✅ Endpoint working, returning test response');
    return NextResponse.json({
      success: true,
      message: `Test lookup for username: ${username}`,
      timestamp: new Date().toISOString(),
      session: {
        user: session.user.email,
        role: session.user.role
      },
      note: 'This is a test response. Full Slack lookup will be implemented once we verify the endpoint works.'
    });

  } catch (error) {
    console.error('💥 Error in user lookup API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
