import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangelogService } from '@/lib/changelog-service';
import {
  buildTabColumnUpdate,
  applyTabSideEffects,
  InvalidTabError,
} from '@/lib/sow/tab-column-mapping';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { tab, data } = await request.json();
    const sowId = (await params).id;
    
    // Get user session to check role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info to check role
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the SOW to ensure it exists
    const { data: existingSOW, error: findError } = await supabase
      .from('sows')
      .select('*')
      .eq('id', sowId)
      .single();

    if (findError || !existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Authorization: only the SOW author or an elevated role may edit this SOW.
    // (The service-role client bypasses RLS, so this object-level check is the
    // only thing preventing any authenticated user from editing any SOW by id.)
    const elevatedRoles = ['admin', 'manager', 'pmo'];
    const isOwner = existingSOW.author_id === user.id;
    if (!isOwner && !elevatedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this SOW' },
        { status: 403 }
      );
    }

    // Check if SOW is in approval status and restrict edits (except for admins editing pricing)
    const isAdmin = user.role === 'admin';
    const isInReview = existingSOW.status === 'in_review';
    const isPricingTab = tab === 'Pricing';
    
    // If SOW is in review, only allow admins to edit pricing/discounts
    if (isInReview && !(isAdmin && isPricingTab)) {
      return NextResponse.json({ 
        error: 'SOW is currently under review. Only admins can edit pricing and discounts during approval.' 
      }, { status: 403 });
    }

    // Map the tab payload to SOW columns, then apply any cross-table side
    // effects (e.g. Objectives → avoma_recordings) before the main update.
    // Both live in the shared mapping module so the bulk save endpoint reuses
    // exactly the same logic.
    let updateData: Record<string, unknown>;
    try {
      updateData = buildTabColumnUpdate(tab, data, existingSOW);
    } catch (err) {
      if (err instanceof InvalidTabError) {
        return NextResponse.json({ error: 'Invalid tab specified' }, { status: 400 });
      }
      throw err;
    }

    await applyTabSideEffects(supabase, sowId, tab, data);

    // Update the SOW with the tab-specific data
    const { data: updatedSOW, error: updateError } = await supabase
      .from('sows')
      .update(updateData)
      .eq('id', sowId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SOW', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedSOW) {
      return NextResponse.json(
        { error: 'SOW update returned no data' },
        { status: 500 }
      );
    }

    // Log changes to changelog
    try {
      await ChangelogService.compareSOWs(
        sowId,
        existingSOW,
        updatedSOW,
        user.id,
        { source: 'tab_update', tab: tab, update_type: 'tab_specific' }
      );
    } catch (changelogError) {
      console.error('❌ Error logging changes to changelog:', changelogError);
      // Don't fail the main operation if changelog logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: `${tab} updated successfully`,
      sowId: sowId
    });

  } catch (error) {
    console.error('Error updating SOW tab:', error);
    return NextResponse.json(
      { error: 'Failed to update SOW tab' },
      { status: 500 }
    );
  }
} 