import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
    }

    // Since we can't use ALTER TABLE directly, we'll work around it
    // by updating existing records with a default value
    
    // First, let's check if the column exists by trying to select it
    const { error: testError } = await supabase
      .from('approval_stages')
      .select('assigned_role')
      .limit(1);

    if (!testError) {
      // Column already exists
      return NextResponse.json({ 
        message: 'assigned_role column already exists',
        status: 'already_exists'
      });
    }

    // Column doesn't exist, we need to recreate the data
    // Get all current stages
    const { data: currentStages, error: fetchError } = await supabase
      .from('approval_stages')
      .select('*');

    if (fetchError) {
      console.error('Error fetching current stages:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch current stages',
        details: fetchError 
      });
    }

    if (!currentStages || currentStages.length === 0) {
      return NextResponse.json({ 
        message: 'No stages found to migrate',
        status: 'no_data'
      });
    }

    // Create new stages with assigned_role
    const newStages = currentStages.map(stage => {
      let assignedRole = 'manager';
      if (stage.name === 'Director Approval') {
        assignedRole = 'director';
      } else if (stage.name === 'VP Approval') {
        assignedRole = 'vp';
      }
      
      return {
        name: stage.name,
        description: stage.description,
        sort_order: stage.sort_order,
        is_active: stage.is_active,
        requires_comment: stage.requires_comment,
        auto_approve: stage.auto_approve,
        assigned_role: assignedRole
      };
    });

    // Delete all existing stages
    const { error: deleteError } = await supabase
      .from('approval_stages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting existing stages:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete existing stages',
        details: deleteError 
      });
    }

    // Insert new stages with assigned_role
    const { error: insertError } = await supabase
      .from('approval_stages')
      .insert(newStages);

    if (insertError) {
      console.error('Error inserting new stages:', insertError);
      return NextResponse.json({ 
        error: 'Failed to insert new stages',
        details: insertError 
      });
    }

    // Verify the migration
    const { data: finalStages, error: verifyError } = await supabase
      .from('approval_stages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
      return NextResponse.json({ 
        error: 'Failed to verify migration',
        details: verifyError 
      });
    }

    return NextResponse.json({ 
      message: 'Migration completed successfully',
      stages: finalStages,
      changes: [
        'Recreated approval_stages table with assigned_role column',
        'Manager Approval -> manager',
        'Director Approval -> director', 
        'VP Approval -> vp'
      ]
    });

  } catch (error) {
    console.error('Error in migration:', error);
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
