import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { loadSegmentRules } from '@/lib/segment-rules-server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const rules = await loadSegmentRules(supabase);
  return NextResponse.json({ rules });
}
