import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PMHoursRemovalService } from '@/lib/pm-hours-removal-service';
import { authOptions } from '@/lib/auth';

// GET - Get PM hours removal requests for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get sowId from query parameters if provided
    const { searchParams } = new URL(request.url);
    const sowId = searchParams.get('sowId');

    // Check if user is PMO or Admin
    const isPMDirector = await PMHoursRemovalService.isPMDirector(user.id, supabase);
    const isAdmin = user.role === 'admin';
    
    let requests;
    if (sowId) {
      // If sowId is provided, get requests for that specific SOW
      requests = await PMHoursRemovalService.getSOWRequests(sowId, supabase);
    } else if (isPMDirector || isAdmin) {
      // PM Directors and Admins see all requests
      requests = await PMHoursRemovalService.getDashboardData(supabase);
    } else {
      // Regular users see only their own requests, but still get dashboard format
      requests = await PMHoursRemovalService.getUserDashboardData(user.id, supabase);
    }

    return NextResponse.json({ requests, isPMDirector, isAdmin });
  } catch (error) {
    console.error('Error fetching PM hours removal requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new PM hours removal request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { sowId, currentPMHours, reason } = await request.json();

    // Validate required fields
    if (!sowId || currentPMHours === undefined || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: sowId, currentPMHours, reason' 
      }, { status: 400 });
    }

    // Check if SOW is in draft status
    const { data: sow } = await supabase
      .from('sows')
      .select('status, author_id')
      .eq('id', sowId)
      .single();

    if (!sow) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    if (sow.status !== 'draft') {
      return NextResponse.json({ 
        error: 'PM hours requirement disable requests can only be made for SOWs in draft status' 
      }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    if (sow.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ 
        error: 'You can only request PM hours requirement disable for SOWs you created' 
      }, { status: 403 });
    }

    // Create the request
    const result = await PMHoursRemovalService.createRequest(
      sowId,
      user.id,
      currentPMHours,
      reason,
      supabase
    );

    if (!result.success) {
      console.error('Failed to create PM hours removal request:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ 
      success: true, 
      request: result.request 
    });
  } catch (error) {
    console.error('Error creating PM hours removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

