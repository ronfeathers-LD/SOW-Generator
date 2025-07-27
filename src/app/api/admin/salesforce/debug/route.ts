import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as jsforce from 'jsforce';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { session };
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { username, password, securityToken, loginUrl } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Clean the login URL (remove trailing spaces and slashes)
    const cleanLoginUrl = (loginUrl || 'https://login.salesforce.com').trim().replace(/\/$/, '');
    
    console.log('Debug: Testing Salesforce connection with:');
    console.log('Original Login URL:', loginUrl);
    console.log('Clean Login URL:', cleanLoginUrl);
    console.log('Username:', username);
    console.log('Has security token:', !!securityToken);
    console.log('Security token length:', securityToken ? securityToken.length : 0);
    console.log('Security token preview:', securityToken ? `${securityToken.substring(0, 4)}...${securityToken.substring(securityToken.length - 4)}` : 'None');

    // Create a new connection with the cleaned login URL
    const conn = new jsforce.Connection({
      loginUrl: cleanLoginUrl
    });

    try {
      // Attempt authentication with different methods
      console.log('Debug: Attempting authentication...');
      console.log('Debug: Password length:', password ? password.length : 0);
      console.log('Debug: Combined password+token length:', (password + (securityToken || '')).length);
      
      // Method 1: Standard login with password + security token
      try {
        await conn.login(username, password + (securityToken || ''));
        console.log('Debug: Authentication successful with password + token');
      } catch (error) {
        console.log('Debug: Method 1 failed, trying password only...');
        try {
          // Method 2: Try with password only (in case token is already appended)
          await conn.login(username, password);
          console.log('Debug: Authentication successful with password only');
        } catch (error2) {
          console.log('Debug: Both methods failed');
          throw error2; // Re-throw the second error
        }
      }
      
      console.log('Debug: Access token:', conn.accessToken ? 'Present' : 'Missing');
      console.log('Debug: Instance URL:', conn.instanceUrl);

      // Test a simple query
      const result = await conn.query('SELECT Id FROM User LIMIT 1');
      console.log('Debug: Query successful, records found:', result.records.length);

      return NextResponse.json({ 
        success: true, 
        message: 'Salesforce connection test successful',
        debug: {
          loginUrl: cleanLoginUrl,
          instanceUrl: conn.instanceUrl,
          hasAccessToken: !!conn.accessToken,
          queryResult: result.records.length
        }
      });

    } catch (error) {
      console.error('Debug: Authentication failed:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Debug: Error message:', error.message);
        console.error('Debug: Error name:', error.name);
      }

      // Provide helpful troubleshooting information
      let troubleshootingTips: string[] = [];
      if (errorMessage.includes('INVALID_LOGIN')) {
        troubleshootingTips = [
          'Check if your account is locked due to multiple failed login attempts',
          'Verify your password is correct for this specific dev org',
          'Ensure your security token is current (reset if needed)',
          'Try logging into the org manually to verify credentials',
          'Check if your IP address is whitelisted in Salesforce'
        ];
      }

      return NextResponse.json(
        { 
          error: 'Salesforce connection test failed',
          details: errorMessage,
          troubleshooting: troubleshootingTips,
          debug: {
            loginUrl: cleanLoginUrl,
            username: username,
            hasSecurityToken: !!securityToken
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 