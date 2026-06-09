import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Suggest a company logo to reuse on a SOW that doesn't have one yet, pulled
 * from the most recent prior SOW for the same account. Matches on
 * `salesforce_account_id` when available (most reliable), otherwise on
 * `client_name`. Returns `{ logo: null }` when there's nothing to suggest
 * (the SOW already has a logo, no account match, or no prior logo exists).
 *
 * Read-only; the client decides whether to apply the suggestion.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sowId = (await params).id;

    const { data: current, error: currentError } = await supabase
      .from('sows')
      .select('id, salesforce_account_id, client_name, company_logo')
      .eq('id', sowId)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ logo: null });
    }

    // Already has a logo — nothing to suggest.
    if (current.company_logo) {
      return NextResponse.json({ logo: null });
    }

    let query = supabase
      .from('sows')
      .select('company_logo, sow_title, created_at')
      .neq('id', sowId)
      .not('company_logo', 'is', null)
      .neq('company_logo', '')
      .order('created_at', { ascending: false })
      .limit(1);

    if (current.salesforce_account_id) {
      query = query.eq('salesforce_account_id', current.salesforce_account_id);
    } else if (current.client_name) {
      query = query.eq('client_name', current.client_name);
    } else {
      // No way to identify the account.
      return NextResponse.json({ logo: null });
    }

    const { data: prior, error: priorError } = await query;
    const match = prior?.[0];

    if (priorError || !match?.company_logo) {
      return NextResponse.json({ logo: null });
    }

    return NextResponse.json({
      logo: match.company_logo,
      sourceTitle: match.sow_title || null,
      sourceCreatedAt: match.created_at || null,
    });
  } catch (error) {
    console.error('Error suggesting company logo:', error);
    // Non-critical — degrade gracefully to "no suggestion".
    return NextResponse.json({ logo: null });
  }
}
