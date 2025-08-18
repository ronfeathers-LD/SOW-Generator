import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserLookupService, SlackUser } from '@/lib/slack-user-lookup';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // Check bot token
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ 
        error: 'SLACK_BOT_TOKEN not configured',
        debug: {
          hasBotToken: false,
          hasWorkspaceDomain: !!process.env.SLACK_WORKSPACE_DOMAIN,
          workspaceDomain: process.env.SLACK_WORKSPACE_DOMAIN
        }
      }, { status: 400 });
    }

    // Initialize service
    SlackUserLookupService.initialize(botToken);

    // Test token validation
    const tokenValid = await SlackUserLookupService.validateToken();
    
    // Get workspace info
    const workspaceInfo = await SlackUserLookupService.getWorkspaceInfo();
    
    // Try to get all users
    let allUsers: SlackUser[] = [];
    let usersError: string | null = null;
    try {
      allUsers = await SlackUserLookupService.getAllUsers();
    } catch (error) {
      usersError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Try different lookup methods
    const lookupResults: {
      byUsername: { success: boolean; user?: SlackUser; error?: string } | null;
      byEmail: { success: boolean; user?: SlackUser; error?: string } | null;
      fromAllUsers: { success: boolean; user?: SlackUser; error?: string } | null;
    } = {
      byUsername: null,
      byEmail: null,
      fromAllUsers: null
    };

    try {
      // Try username lookup
      lookupResults.byUsername = await SlackUserLookupService.lookupUserByUsername(username);
    } catch (error) {
      lookupResults.byUsername = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Try email lookup if we have a workspace domain
      const workspaceDomain = process.env.SLACK_WORKSPACE_DOMAIN;
      if (workspaceDomain) {
        const email = `${username}@${workspaceDomain}`;
        lookupResults.byEmail = await SlackUserLookupService.lookupUserByEmail(email);
      }
    } catch (error) {
      lookupResults.byEmail = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Search in all users
    if (allUsers.length > 0) {
      const foundUser = allUsers.find(user => {
        const displayName = user.profile.display_name?.toLowerCase();
        const realName = user.profile.real_name?.toLowerCase();
        const name = user.name.toLowerCase();
        const searchTerm = username.toLowerCase();
        
        return displayName === searchTerm || 
               realName === searchTerm || 
               name === searchTerm ||
               displayName?.includes(searchTerm) ||
               realName?.includes(searchTerm) ||
               name.includes(searchTerm);
      });

      if (foundUser) {
        lookupResults.fromAllUsers = { success: true, user: foundUser };
      } else {
        lookupResults.fromAllUsers = { success: false, error: 'User not found in all users list' };
      }
    }

    return NextResponse.json({
      debug: {
        username,
        botTokenConfigured: !!botToken,
        tokenValid,
        workspaceInfo,
        totalUsers: allUsers.length,
        usersError,
        lookupResults,
        environment: {
          SLACK_BOT_TOKEN: botToken ? 'SET' : 'NOT SET',
          SLACK_WORKSPACE_DOMAIN: process.env.SLACK_WORKSPACE_DOMAIN || 'NOT SET',
          SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ? 'SET' : 'NOT SET'
        }
      }
    });

  } catch (error) {
    console.error('Error in debug lookup:', error);
    return NextResponse.json({ 
      error: 'Debug lookup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
