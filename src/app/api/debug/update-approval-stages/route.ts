import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // First, delete all existing approval records since they reference stages
    const { error: deleteApprovalsError } = await supabase
      .from('sow_approvals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteApprovalsError) {
      console.error('Error deleting existing approvals:', deleteApprovalsError);
      return NextResponse.json({ error: 'Failed to delete existing approvals' });
    }

    // Delete all existing approval rules since they reference stages
    const { error: deleteRulesError } = await supabase
      .from('approval_rules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteRulesError) {
      console.error('Error deleting existing rules:', deleteRulesError);
      return NextResponse.json({ error: 'Failed to delete existing rules' });
    }

    // Now delete all existing approval stages
    const { error: deleteError } = await supabase
      .from('approval_stages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting existing stages:', deleteError);
      return NextResponse.json({ error: 'Failed to delete existing stages' });
    }

    // Insert the new simplified stages
    const { data: newStages, error: insertError } = await supabase
      .from('approval_stages')
      .insert([
        {
          name: 'Manager Approval',
          description: 'Approval by project manager',
          sort_order: 1,
          requires_comment: false,
          is_active: true
        },
        {
          name: 'Director Approval',
          description: 'Final approval by director',
          sort_order: 2,
          requires_comment: true,
          is_active: true
        }
      ])
      .select();

    if (insertError) {
      console.error('Error inserting new stages:', insertError);
      return NextResponse.json({ error: 'Failed to insert new stages' });
    }



    return NextResponse.json({ 
      message: 'Approval stages updated successfully',
      newStages: newStages,
      deletedOldApprovals: true
    });

  } catch (error) {
    console.error('Error updating approval stages:', error);
    return NextResponse.json({ error: 'Failed to update approval stages' });
  }
}
