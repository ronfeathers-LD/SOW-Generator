import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUser } from '@/lib/slack-user-lookup';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per IP

// Server-side cache for Slack users to reduce API calls
const userCache = {
  data: null as SlackUser[] | null,
  timestamp: 0,
  ttl: 5 * 60 * 60 * 1000 // 5 hours cache
};

// Helper function to check if cache is valid
function isCacheValid(): boolean {
  if (!userCache.data) return false;
  const now = Date.now();
  return (now - userCache.timestamp) < userCache.ttl;
}

// Helper function to update cache
function updateCache(users: SlackUser[]): void {
  userCache.data = users;
  userCache.timestamp = Date.now();
}



export async function GET(request: Request) {
  try {

    
    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const now = Date.now();
    const clientData = rateLimitMap.get(clientIP);
    
    if (clientData && now < clientData.resetTime) {
      if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json({ 
          error: 'Rate limited. Too many requests.',
          users: []
        }, { status: 429 });
      }
      clientData.count++;
    } else {
      // Reset or initialize rate limit for this client
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we have valid cached data first
    if (isCacheValid() && userCache.data && userCache.data.length > 0) {
      console.log(`Returning ${userCache.data!.length} users from cache`);
      
      const response = NextResponse.json({ users: userCache.data });
      response.headers.set('Cache-Control', 'public, max-age=18000'); // Cache for 5 hours
      response.headers.set('ETag', `"cached-${userCache.data!.length}-${userCache.timestamp}"`);
      
      return response;
    }

    // Check if Slack bot token is configured before attempting to fetch users
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure it in Admin → Slack.',
        users: []
      }, { status: 200 }); // Return 200 with empty users array instead of error
    }

    // Get real users from Slack workspace
    try {
      const { SlackUserLookupService } = await import('@/lib/slack-user-lookup');
      
      // Initialize the service with the bot token
      SlackUserLookupService.initialize(botToken);
      
      // Fetch all Slack users
      const allSlackUsers = await SlackUserLookupService.getAllUsers();
      
      // Simple alphabetical sorting - no complex mapping logic
      const sortedUsers = allSlackUsers.sort((a, b) => {
        const aUsername = a.name?.toLowerCase() || '';
        const bUsername = b.name?.toLowerCase() || '';
        return aUsername.localeCompare(bUsername);
      });
      
      console.log(`Successfully fetched ${sortedUsers.length} users with simple alphabetical sorting`);
      
      // No system user flags - just return the users as-is
      const usersWithFlags = sortedUsers.map(user => ({
        ...user,
        isSystemUser: false // No more system user concept
      }));
      
      // Update our server-side cache
      updateCache(usersWithFlags);
      
      // Add cache headers to reduce client-side requests
      const response = NextResponse.json({ users: usersWithFlags });
      response.headers.set('Cache-Control', 'public, max-age=18000'); // Cache for 5 hours
      response.headers.set('ETag', `"${sortedUsers.length}-${Date.now()}"`); // Simple ETag
      
      return response;
      
    } catch (error) {
      console.error('Error fetching Slack users:', error);
      
      // Fallback to empty array if Slack API fails
      const response = NextResponse.json({ 
        error: 'Failed to fetch Slack users, but @ mentions will still work',
        users: []
      }, { status: 200 });
      
      // Add cache headers even for error responses
      response.headers.set('Cache-Control', 'public, max-age=60'); // Shorter cache for errors
      response.headers.set('ETag', `"error-${Date.now()}"`);
      
      return response;
    }

  } catch (error) {
    console.error('Error fetching Slack workspace users:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch Slack workspace users',
      users: []
    }, { status: 200 }); // Return 200 with empty users array instead of error
  }
}
