import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Check if the assigned_user_id column exists
    const { data: stages, error: checkError } = await supabase
      .from('approval_stages')
      .select('id, name, assigned_user_id')
      .limit(1);

    if (checkError) {
      if (checkError.message.includes('column "assigned_user_id" does not exist')) {
        return NextResponse.json({ 
          error: 'assigned_user_id column does not exist',
          details: checkError,
          solution: 'The column needs to be added manually to the approval_stages table. Run: ALTER TABLE approval_stages ADD COLUMN assigned_user_id UUID REFERENCES users(id);'
        });
      }
      return NextResponse.json({ 
        error: 'Failed to check column',
        details: checkError 
      });
    }



    return NextResponse.json({ 
      message: 'assigned_user_id column added successfully',
      stages: stages,
      columnExists: true
    });

  } catch (error) {
    console.error('Error adding assigned_user_id column:', error);
    return NextResponse.json({ 
      error: 'Failed to add assigned_user_id column',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
