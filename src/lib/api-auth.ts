import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type AuthResult = { session: Session } | { error: NextResponse };

/**
 * Require an authenticated session, optionally restricted to specific roles.
 *
 * Always pass `authOptions` (via this helper) so `session.user.role` is
 * populated — calling `getServerSession()` without it drops the role.
 *
 * Usage:
 *   const auth = await requireAuth(['admin']);
 *   if ('error' in auth) return auth.error;
 *   const { session } = auth;
 */
export async function requireAuth(allowedRoles?: string[]): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role || '')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}
