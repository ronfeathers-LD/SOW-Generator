import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (typeof body.display_name === 'string' && body.display_name.trim()) {
    update.display_name = body.display_name.trim();
  }
  if (typeof body.pm_removal_self_serve === 'boolean') {
    update.pm_removal_self_serve = body.pm_removal_self_serve;
  }
  if (body.extra_hours !== undefined) {
    const hours = Number(body.extra_hours);
    if (!Number.isInteger(hours) || hours < 0 || hours > 100) {
      return new NextResponse('extra_hours must be an integer between 0 and 100', { status: 400 });
    }
    update.extra_hours = hours;
  }
  if (Object.keys(update).length === 0) {
    return new NextResponse('No valid fields to update', { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('segment_rules')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return new NextResponse('Not found', { status: 404 });
    return new NextResponse(error.message, { status: 500 });
  }
  return NextResponse.json(data);
}
