import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangelogService } from '@/lib/changelog-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the original SOW (excluding hidden SOWs)
    const { data: originalSOW, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
      .eq('is_hidden', false)
      .single();

    if (error || !originalSOW) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('sows')
      .select('version')
      .or(`id.eq.${(await params).id},parent_id.eq.${(await params).id}`)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Create a new version
    const { data: newVersion, error: createError } = await supabase
      .from('sows')
      .insert({
        ...originalSOW,
        id: undefined, // Let Supabase generate a new ID
        version: (latestVersion?.version || 0) + 1,
        is_latest: true,
        parent_id: originalSOW.parent_id || originalSOW.id,
        
        // Reset lifecycle fields for new version
        status: 'draft', // New versions should always be draft and editable
        created_at: undefined, // Let Supabase set current timestamp
        updated_at: undefined, // Let Supabase set current timestamp
        signature_date: undefined, // Reset signature date
        start_date: undefined, // Reset project start date

        
        // Reset content edit tracking flags
        intro_content_edited: false,
        scope_content_edited: false,
        objectives_disclosure_content_edited: false,
        assumptions_content_edited: false,
        project_phases_content_edited: false,
        roles_content_edited: false,
        deliverables_content_edited: false,
        objective_overview_content_edited: false,
        key_objectives_content_edited: false,
        
        // Preserve business data with safe defaults
        client_roles: originalSOW.client_roles ?? [],
        pricing_roles: originalSOW.pricing_roles ?? [],
        billing_info: originalSOW.billing_info ?? {},
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating new version:', createError);
      return NextResponse.json(
        { error: 'Failed to create new version' },
        { status: 500 }
      );
    }

    // Update all other versions to not be latest
    await supabase
      .from('sows')
      .update({ is_latest: false })
      .or(`id.eq.${(await params).id},parent_id.eq.${(await params).id}`)
      .neq('id', newVersion.id);

    // Log version creation to changelog
    try {
      const session = await getServerSession(authOptions);
      await ChangelogService.logVersionCreation(
        newVersion.id,
        (await params).id,
        session?.user?.id,
        { source: 'version_creation', parent_version: originalSOW.version }
      );
    } catch (changelogError) {
      console.error('Error logging version creation to changelog:', changelogError);
      // Don't fail the main operation if changelog logging fails
    }

    return NextResponse.json(newVersion);
  } catch (error) {
    console.error('Error creating new version:', error);
    return NextResponse.json(
      { error: 'Failed to create new version' },
      { status: 500 }
    );
  }
} 