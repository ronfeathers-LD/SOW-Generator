import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackMentionService } from '@/lib/slack-mention-service';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per IP

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

    // Check if Slack bot token is configured before attempting to fetch users
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ 
        error: 'Slack bot token not configured. Please configure it in Admin → Slack.',
        users: []
      }, { status: 200 }); // Return 200 with empty users array instead of error
    }

    // Get only users from Slack workspace who are in our system (much more efficient)
    const users = await SlackMentionService.getSystemSlackUsers();
    
    // Add cache headers to reduce client-side requests
    const response = NextResponse.json({ users });
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    response.headers.set('ETag', `"${users.length}-${Date.now()}"`); // Simple ETag
    
    return response;

  } catch (error) {
    console.error('Error fetching Slack workspace users:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch Slack workspace users',
      users: []
    }, { status: 200 }); // Return 200 with empty users array instead of error
  }
}
