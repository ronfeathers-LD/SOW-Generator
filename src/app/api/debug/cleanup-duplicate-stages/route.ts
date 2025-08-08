import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all stages grouped by name
    const { data: allStages, error: fetchError } = await supabase
      .from('approval_stages')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch stages',
        details: fetchError 
      });
    }

    // Group stages by name
    const stageGroups: { [key: string]: any[] } = {};
    allStages?.forEach(stage => {
      if (!stageGroups[stage.name]) {
        stageGroups[stage.name] = [];
      }
      stageGroups[stage.name].push(stage);
    });

    // Find duplicates
    const duplicates: any[] = [];
    Object.entries(stageGroups).forEach(([name, stages]) => {
      if (stages.length > 1) {
        // Keep the first one (oldest), mark the rest as duplicates
        duplicates.push(...stages.slice(1));
      }
    });

    if (duplicates.length === 0) {
      return NextResponse.json({ 
        message: 'No duplicate stages found',
        stages: allStages 
      });
    }

    // Delete duplicate stages
    const duplicateIds = duplicates.map(stage => stage.id);
    const { error: deleteError } = await supabase
      .from('approval_stages')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete duplicate stages',
        details: deleteError 
      });
    }

    // Get remaining stages
    const { data: remainingStages, error: remainingError } = await supabase
      .from('approval_stages')
      .select('*')
      .order('sort_order', { ascending: true });

    return NextResponse.json({ 
      message: 'Duplicate stages cleaned up successfully',
      deletedCount: duplicates.length,
      deletedStages: duplicates,
      remainingStages: remainingStages || []
    });

  } catch (error) {
    console.error('Error cleaning up duplicate stages:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup duplicate stages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
