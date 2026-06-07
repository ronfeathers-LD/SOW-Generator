import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import salesforceCache from '@/lib/salesforce-cache';

// GET: Retrieve cache statistics
export async function GET() {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const stats = salesforceCache.getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cache statistics' },
      { status: 500 }
    );
  }
}

// POST: Clear cache
export async function POST(request: NextRequest) {
  try {
    const __auth = await requireAuth();
    if ('error' in __auth) return __auth.error;
    const { action, accountId } = await request.json();

    if (action === 'clearAll') {
      salesforceCache.clearAllCache();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared'
      });
    } else if (action === 'clearAccount' && accountId) {
      salesforceCache.clearAccountCache(accountId);
      return NextResponse.json({
        success: true,
        message: `Cache cleared for account ${accountId}`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing accountId' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 