import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get the Director Approval stage ID (take the first one if multiple exist)
    const { data: directorStages, error: stageError } = await supabase
      .from('approval_stages')
      .select('id')
      .eq('name', 'Director Approval')
      .order('created_at', { ascending: true })
      .limit(1);

    if (stageError || !directorStages || directorStages.length === 0) {
      return NextResponse.json({ 
        error: 'Director Approval stage not found',
        details: stageError 
      });
    }

    const directorStage = directorStages[0];

    if (stageError || !directorStage) {
      return NextResponse.json({ 
        error: 'Director Approval stage not found',
        details: stageError 
      });
    }

    // Update all approval rules that have null stage_id
    const { data: updatedRules, error: updateError } = await supabase
      .from('approval_rules')
      .update({ stage_id: directorStage.id })
      .is('stage_id', null)
      .select();

    if (updateError) {
      console.error('Error updating approval rules:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update approval rules',
        details: updateError 
      });
    }

    return NextResponse.json({ 
      message: 'Approval rules updated successfully',
      updatedRules: updatedRules,
      directorStageId: directorStage.id
    });

  } catch (error) {
    console.error('Error fixing approval rules:', error);
    return NextResponse.json({ error: 'Failed to fix approval rules' });
  }
}
