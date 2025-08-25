import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate that session.user.id exists
    if (!session.user?.id) {
      console.error('Missing session user ID');
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 400 }
      );
    }

    // Debug logging
    console.log('Session user ID:', session.user.id, 'Type:', typeof session.user.id);

    const { id } = await params;
    const body = await request.json();
    const { version_id, change_reason } = body;

    if (!version_id) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      );
    }

    // Get the version to revert to
    const { data: version, error: versionError } = await supabase
      .from('ai_prompt_versions')
      .select('*')
      .eq('id', version_id)
      .eq('prompt_id', id)
      .single();

    if (versionError || !version) {
      console.error('Error fetching version:', versionError);
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get current prompt to create a version
    const { data: currentPrompt, error: fetchError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current prompt:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current prompt' },
        { status: 500 }
      );
    }

    // Create a version record of the current prompt
    const { error: versionCreateError } = await supabase
      .from('ai_prompt_versions')
      .insert([
        {
          prompt_id: id,
          version_number: currentPrompt.current_version || 1,
          name: currentPrompt.name,
          description: currentPrompt.description,
          prompt_content: currentPrompt.prompt_content,
          is_active: currentPrompt.is_active,
          sort_order: currentPrompt.sort_order,
          created_by: session.user.id,
          change_reason: change_reason || 'Reverted to previous version',
          is_current: false
        }
      ]);

    if (versionCreateError) {
      console.error('Error creating version record:', versionCreateError);
      return NextResponse.json(
        { error: 'Failed to create version record' },
        { status: 500 }
      );
    }

    // Update the current version number
    const newVersionNumber = (currentPrompt.current_version || 1) + 1;

    // Revert the prompt to the selected version
    const { data: prompt, error } = await supabase
      .from('ai_prompts')
      .update({
        name: version.name,
        description: version.description,
        prompt_content: version.prompt_content,
        is_active: version.is_active,
        sort_order: version.sort_order,
        current_version: newVersionNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error reverting AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to revert AI prompt' },
        { status: 500 }
      );
    }

    // Mark all versions as not current
    const { error: updateVersionError } = await supabase
      .from('ai_prompt_versions')
      .update({ is_current: false })
      .eq('prompt_id', id);

    if (updateVersionError) {
      console.error('Error updating version flags:', updateVersionError);
    }

    // Insert the reverted version as current
    const { error: insertNewVersionError } = await supabase
      .from('ai_prompt_versions')
      .insert([
        {
          prompt_id: id,
          version_number: newVersionNumber,
          name: version.name,
          description: version.description,
          prompt_content: version.prompt_content,
          is_active: version.is_active,
          sort_order: version.sort_order,
          created_by: session.user.id,
          change_reason: change_reason || 'Reverted to previous version',
          is_current: true
        }
      ]);

    if (insertNewVersionError) {
      console.error('Error inserting reverted version:', insertNewVersionError);
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error in AI prompt revert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
