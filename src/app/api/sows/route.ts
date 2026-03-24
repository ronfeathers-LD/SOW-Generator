import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.SOW_API_KEY;
  if (!apiKey) return false;

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;

  return auth.slice(7) === apiKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const validStatuses = ['draft', 'in_review', 'approved', 'rejected', 'recalled'];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('sows')
      .select(`
        id,
        client_name,
        sow_title,
        status,
        submitted_at,
        submitted_by,
        created_at,
        updated_at,
        author:users!sows_author_id_fkey(name, email)
      `)
      .eq('is_hidden', false);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sows, error } = await query.order('submitted_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('SOW API error:', error);
      return NextResponse.json({ error: 'Failed to fetch SOWs' }, { status: 500 });
    }

    // Look up submitter names (submitted_by has no FK constraint)
    const submitterIds = Array.from(new Set(sows.map(s => s.submitted_by).filter(Boolean)));
    const submitterMap = new Map<string, string>();
    if (submitterIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', submitterIds);
      for (const u of users || []) {
        submitterMap.set(u.id, u.name || u.email);
      }
    }

    const result = sows.map(sow => ({
      id: sow.id,
      customer: sow.client_name || '',
      title: sow.sow_title || '',
      submitted_date: sow.submitted_at
        ? new Date(sow.submitted_at).toISOString().split('T')[0]
        : null,
      author: (sow.author as { name: string; email: string } | null)?.name || null,
      submitted_by: sow.submitted_by ? submitterMap.get(sow.submitted_by) || null : null,
      status: sow.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('SOW API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
