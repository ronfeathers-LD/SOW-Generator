import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackMentionService } from '@/lib/slack-mention-service';

export async function GET(request: NextRequest) {
  console.log('🔍 User lookup API called at /api/slack/lookup');
  
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
    console.log('🔍 Username parameter:', username);

    if (!username) {
      console.log('❌ No username provided');
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // Check if Slack bot token is configured
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      console.log('❌ SLACK_BOT_TOKEN not configured');
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure it in Admin → Slack.' 
      }, { status: 400 });
    }

    // Perform actual Slack user lookup
    try {
      console.log(`🔍 Looking up user: ${username}`);
      const result = await SlackMentionService.testUserLookup(username);
      
      if (result.success && result.user) {
        console.log('✅ User found:', result.user.name);
        return NextResponse.json(result.user);
      } else {
        console.log('❌ User not found:', result.error);
        
        // Provide more helpful error messages
        let errorMessage = result.error || 'User not found in Slack workspace';
        let statusCode = 404;
        
        if (result.error === 'SLACK_BOT_TOKEN not configured') {
          errorMessage = 'Slack bot token not configured. Please configure it in Admin → Slack.';
          statusCode = 400;
        } else if (result.error?.includes('invalid_arguments')) {
          errorMessage = 'Invalid username format. Try using just the username (e.g., "ronfeathers") or email address.';
          statusCode = 400;
        } else if (result.error?.includes('rate_limited')) {
          errorMessage = 'Slack API rate limit exceeded. Please try again in a few minutes.';
          statusCode = 429;
        }
        
        return NextResponse.json({ 
          error: errorMessage,
          username: username,
          suggestion: 'Try using just the username or check if the user exists in your Slack workspace'
        }, { status: statusCode });
      }
    } catch (lookupError) {
      console.error('💥 Lookup error:', lookupError);
      
      let errorMessage = 'Failed to lookup user in Slack';
      let details = 'Unknown error';
      
      if (lookupError instanceof Error) {
        details = lookupError.message;
        if (lookupError.message.includes('SLACK_BOT_TOKEN not configured')) {
          errorMessage = 'Slack bot token not configured';
        } else if (lookupError.message.includes('rate_limited')) {
          errorMessage = 'Slack API rate limit exceeded';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: details,
        username: username
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Error in user lookup API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
