import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sowId = (await params).id;

    // Check if approval records already exist
    const { data: existingApprovals } = await supabase
      .from('sow_approvals')
      .select('id')
      .eq('sow_id', sowId);

    if (existingApprovals && existingApprovals.length > 0) {
      return NextResponse.json({ 
        message: 'Approval records already exist',
        count: existingApprovals.length 
      });
    }

    // Get all active approval stages
    const { data: stages, error: stagesError } = await supabase
      .from('approval_stages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      return NextResponse.json({ 
        error: 'No approval stages found',
        details: stagesError 
      });
    }

    // Create approval records for each stage
    const approvalRecords = stages.map(stage => ({
      sow_id: sowId,
      stage_id: stage.id,
      status: 'pending',
      version: 1
    }));

    const { data: createdApprovals, error: insertError } = await supabase
      .from('sow_approvals')
      .insert(approvalRecords)
      .select();

    if (insertError) {
      console.error('Error creating approval records:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create approval records',
        details: insertError 
      });
    }

    return NextResponse.json({ 
      message: 'Approval records created successfully',
      created: createdApprovals,
      count: createdApprovals?.length || 0
    });

  } catch (error) {
    console.error('Error creating approval records:', error);
    return NextResponse.json({ error: 'Failed to create approval records' });
  }
}
