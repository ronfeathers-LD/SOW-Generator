import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PMHoursRemovalService } from '@/lib/pm-hours-removal-service';

// GET - Get a specific PM hours removal request with comments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const result = await PMHoursRemovalService.getRequest(id, supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      request: result.request, 
      comments: result.comments 
    });
  } catch (error) {
    console.error('Error fetching PM hours removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Approve or reject a PM hours removal request
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
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

    // Check if user is PMO or Admin
    const isPMDirector = await PMHoursRemovalService.isPMDirector(user.id, supabase);
    const isAdmin = user.role === 'admin';
    
    if (!isPMDirector && !isAdmin) {
      return NextResponse.json({ error: 'Only PMO users or Admins can approve/reject requests' }, { status: 403 });
    }

    const { id } = await params;
    const { action, comments, reason } = await request.json();

    if (!action || !['approve', 'reject', 'reverse'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve", "reject", or "reverse"' }, { status: 400 });
    }

    // Get the request to find the SOW and get current PM hours
    const { data: requestData, error: requestError } = await supabase
      .from('pm_hours_removal_requests')
      .select('sow_id')
      .eq('id', id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get current PM hours from the SOW's pricing roles
    const { data: sowData, error: sowError } = await supabase
      .from('sows')
      .select('pricing_roles')
      .eq('id', requestData.sow_id)
      .single();

    if (sowError || !sowData) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Calculate current PM hours from pricing roles
    let currentPMHours = 0;
    if (sowData.pricing_roles && Array.isArray(sowData.pricing_roles)) {
      const pmRole = sowData.pricing_roles.find((role: { role: string; total_hours?: number }) => role.role === 'Project Manager');
      if (pmRole) {
        currentPMHours = pmRole.total_hours || 0;
      }
    }

    let result;
    if (action === 'approve') {
      result = await PMHoursRemovalService.approveRequest(id, user.id, currentPMHours, comments, supabase);
    } else if (action === 'reverse') {
      if (!reason) {
        return NextResponse.json({ error: 'Reversal reason is required' }, { status: 400 });
      }
      // Only admins can reverse requests
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can reverse requests' }, { status: 403 });
      }
      result = await PMHoursRemovalService.reverseRequest(id, user.id, reason, supabase);
    } else {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      result = await PMHoursRemovalService.rejectRequest(id, user.id, reason, currentPMHours, supabase);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating PM hours removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a PM hours removal request (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
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

    // Only admins can delete requests
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete requests' }, { status: 403 });
    }

    const { id } = await params;
    const result = await PMHoursRemovalService.deleteRequest(id, user.id, supabase);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PM hours removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

