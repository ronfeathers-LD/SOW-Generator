import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the original SOW
    const { data: originalSOW, error } = await supabase
      .from('sows')
      .select('*')
      .eq('id', (await params).id)
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
        client_roles: originalSOW.client_roles ?? [],
        pricing_roles: originalSOW.pricing_roles ?? [],
        billing_info: originalSOW.billing_info ?? {},
        addendums: originalSOW.addendums ?? [],
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

    return NextResponse.json(newVersion);
  } catch (error) {
    console.error('Error creating new version:', error);
    return NextResponse.json(
      { error: 'Failed to create new version' },
      { status: 500 }
    );
  }
} 