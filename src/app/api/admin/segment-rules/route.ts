import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('segment_rules')
    .select('*')
    .order('segment');
  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }
  return NextResponse.json(data);
}
