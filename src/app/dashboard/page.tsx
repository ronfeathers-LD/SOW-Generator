import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Session } from 'next-auth';
import DashboardClient from '@/components/DashboardClient';
import { authOptions } from '@/lib/auth';

async function getDashboardStats(session: Session) {
  try {
    const supabase = await createServerSupabaseClient();

    // Round 1: user lookup + stats counts + pending approvals (all parallel, no user ID dependency)
    const [
      userResult,
      totalCount,
      draftCount,
      inReviewCount,
      approvedCount,
      rejectedCount,
      recalledCount,
      pendingApprovalsResult,
    ] = await Promise.all([
      // Verify user exists
      supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single(),

      // Stats: HEAD-only count queries (no row data fetched)
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false),
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false).eq('status', 'draft'),
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false).eq('status', 'in_review'),
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false).eq('status', 'approved'),
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false).eq('status', 'rejected'),
      supabase.from('sows').select('*', { count: 'exact', head: true }).eq('is_hidden', false).eq('status', 'recalled'),

      // Pending approvals — no user ID dependency
      supabase
        .from('sows')
        .select('id, client_name, sow_title, status, created_at')
        .eq('is_hidden', false)
        .eq('status', 'in_review')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (userResult.error || !userResult.data) {
      return {
        stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0, recalled: 0 },
        recentSOWs: [],
        pendingApprovals: [],
      };
    }

    // Round 2: Recent SOWs filtered to current user (requires user ID from round 1)
    const recentSOWsResult = await supabase
      .from('sows')
      .select(`
        id,
        client_name,
        sow_title,
        status,
        created_at,
        author:users!sows_author_id_fkey(name),
        products:sow_products(product:products(name))
      `)
      .eq('is_hidden', false)
      .eq('author_id', userResult.data.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const stats = {
      total: totalCount.count || 0,
      draft: draftCount.count || 0,
      in_review: inReviewCount.count || 0,
      approved: approvedCount.count || 0,
      rejected: rejectedCount.count || 0,
      recalled: recalledCount.count || 0,
    };

    if (recentSOWsResult.error) {
      console.warn('Recent SOWs query error:', recentSOWsResult.error);
    }
    if (pendingApprovalsResult.error) {
      console.warn('Pending approvals query error:', pendingApprovalsResult.error);
    }

    const recentSOWs = recentSOWsResult.data?.map(sow => ({
      id: sow.id,
      client_name: sow.client_name,
      sow_title: sow.sow_title,
      status: sow.status,
      created_at: sow.created_at,
      author: (sow.author as unknown as { name: string } | null)?.name
        ? { name: (sow.author as unknown as { name: string }).name }
        : undefined,
      products: sow.products?.map(p => ({
        product: { name: (p.product as unknown as { name: string } | null)?.name || '' }
      })) || [],
    })) || [];

    return {
      stats,
      recentSOWs,
      pendingApprovals: pendingApprovalsResult.data || [],
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0, recalled: 0 },
      recentSOWs: [],
      pendingApprovals: [],
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  const dashboardData = await getDashboardStats(session);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClient
        stats={dashboardData.stats}
        recentSOWs={dashboardData.recentSOWs}
        pendingApprovals={dashboardData.pendingApprovals}
      />
    </div>
  );
}
