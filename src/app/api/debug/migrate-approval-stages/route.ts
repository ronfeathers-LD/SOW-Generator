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

    // Step 1: Check if assigned_role column exists
    const { error: addColumnError } = await supabase
      .from('approval_stages')
      .select('assigned_role')
      .limit(1);

    if (addColumnError && addColumnError.message.includes('column "assigned_role" does not exist')) {
      // Column doesn't exist, we need to recreate the table with the new schema
      
      // First, let's get all current stages
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

      // Create new stages with assigned_role
      const newStages = currentStages?.map(stage => {
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
      if (newStages && newStages.length > 0) {
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
      }
    } else if (addColumnError) {
      // Some other error occurred
      console.error('Error checking assigned_role column:', addColumnError);
      return NextResponse.json({ 
        error: 'Failed to check assigned_role column',
        details: addColumnError 
      });
    }

    // Step 2: Update any stages that don't have assigned_role set
    const { error: updateError } = await supabase
      .from('approval_stages')
      .update({ assigned_role: 'manager' })
      .eq('name', 'Manager Approval')
      .is('assigned_role', null);

    const { error: updateError2 } = await supabase
      .from('approval_stages')
      .update({ assigned_role: 'director' })
      .eq('name', 'Director Approval')
      .is('assigned_role', null);

    const { error: updateError3 } = await supabase
      .from('approval_stages')
      .update({ assigned_role: 'vp' })
      .eq('name', 'VP Approval')
      .is('assigned_role', null);

    // Step 3: Verify the migration
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
        'Updated approval_stages table to use role-based assignment',
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
