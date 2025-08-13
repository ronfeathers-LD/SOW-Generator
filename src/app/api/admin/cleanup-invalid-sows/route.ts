import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalWorkflowService } from '@/lib/approval-workflow-service';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    // Check authentication - only admins can run cleanup
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role to check if admin
    const supabase = createServiceRoleClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (userError || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🧹 Starting cleanup of invalid SOW states...');

    // Get all SOWs that are currently "in_review"
    const { data: inReviewSOWs, error: fetchError } = await supabase
      .from('sows')
      .select('*')
      .eq('status', 'in_review');

    if (fetchError) {
      console.error('Error fetching in-review SOWs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch SOWs' }, { status: 500 });
    }

    console.log(`Found ${inReviewSOWs?.length || 0} SOWs in "in_review" status`);

    let cleanedCount = 0;
    let skippedCount = 0;

    // Check each SOW and reset invalid ones
    for (const sow of inReviewSOWs || []) {
      const validation = ApprovalWorkflowService.validateSOWForApproval(sow);
      
      if (!validation.isValid) {
        console.log(`🧹 Cleaning up invalid SOW: ${sow.id} (${sow.sow_title})`);
        console.log(`   Missing fields: ${validation.missingFields.join(', ')}`);
        console.log(`   Validation errors: ${validation.errors.join(', ')}`);
        
        // Reset SOW status to draft
        const { error: resetError } = await supabase
          .from('sows')
          .update({ 
            status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', sow.id);
        
        if (resetError) {
          console.error(`   ❌ Failed to reset SOW ${sow.id}:`, resetError);
        } else {
          console.log(`   ✅ Reset SOW ${sow.id} to draft status`);
          cleanedCount++;
        }
      } else {
        console.log(`✅ SOW ${sow.id} is valid, keeping in review status`);
        skippedCount++;
      }
    }

    console.log(`🧹 Cleanup complete! Cleaned: ${cleanedCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({ 
      success: true, 
      message: `Cleanup complete: ${cleanedCount} SOWs reset to draft, ${skippedCount} kept in review`,
      cleaned: cleanedCount,
      skipped: skippedCount
    });
    
  } catch (error) {
    console.error('Error during SOW cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    );
  }
}
