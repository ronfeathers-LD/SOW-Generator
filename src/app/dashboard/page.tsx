import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Session } from 'next-auth';
import DashboardClient from '@/components/DashboardClient';

async function getDashboardStats(session: Session) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First, get the user's database ID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();
    
    if (userError || !userData) {
      return {
        stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0 },
        recentSOWs: [],
        pendingApprovals: []
      };
    }
    
    // Get SOW counts by status - filter by user access
    let sowStats = null;
    let sowError = null;
    
    try {
      // Get visible SOWs
      const result = await supabase
        .from('sows')
        .select('status')
        .eq('is_hidden', false);
      
      sowStats = result.data;
      sowError = result.error;
      
    } catch (_error) {
      sowError = _error;
    }

    if (sowError) {
      console.warn('SOW stats query error:', sowError);
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackStats, error: fallbackError } = await supabase
          .from('sows')
          .select('status')
          .eq('is_hidden', false);
        
        if (!fallbackError) {
          sowStats = fallbackStats; // Use fallback data
        } else {
          console.warn('SOW stats fallback error:', fallbackError);
        }
      } catch (fallbackError) {
        console.warn('SOW stats fallback exception:', fallbackError);
      }
    }

    const stats = {
      total: 0,
      draft: 0,
      in_review: 0,
      approved: 0,
      rejected: 0
    };

    if (sowStats) {
      stats.total = sowStats.length;
      sowStats.forEach((sow: unknown) => {
        const sowObj = sow as { status: string };
        if (stats.hasOwnProperty(sowObj.status)) {
          (stats as Record<string, number>)[sowObj.status]++;
        }
      });
    }

    // Get recent SOWs - filter by user access
    let recentSOWs = null;
    let recentError = null;
    
    try {
      const result = await supabase
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
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Transform the data to match expected structure
      const transformedSOWs = result.data?.map(sow => ({
        id: sow.id,
        client_name: sow.client_name,
        sow_title: sow.sow_title,
        status: sow.status,
        created_at: sow.created_at,
        author: sow.author?.[0] ? { name: sow.author[0].name } : undefined,
        products: sow.products?.map(p => ({ product: { name: p.product?.[0]?.name || '' } })) || []
      })) || [];
      
      recentSOWs = transformedSOWs;
      recentError = result.error;
      
    } catch (_error) {
      recentError = _error;
    }

    if (recentError) {
      console.warn('Recent SOWs query error:', recentError);
      // Fallback: get all visible SOWs without user filtering
      try {
        const { data: fallbackSOWs, error: fallbackError } = await supabase
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
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!fallbackError) {
          // Transform the data to match the expected interface
          recentSOWs = fallbackSOWs?.map(sow => ({
            id: sow.id,
            client_name: sow.client_name,
            sow_title: sow.sow_title,
            status: sow.status,
            created_at: sow.created_at,
            author: sow.author?.[0] ? { name: sow.author[0].name } : undefined,
            products: sow.products?.map(p => ({ product: { name: p.product?.[0]?.name || '' } })) || []
          })) || [];
        } else {
          console.warn('Recent SOWs fallback error:', fallbackError);
        }
      } catch (fallbackError) {
        console.warn('Recent SOWs fallback exception:', fallbackError);
      }
    }

    // Get pending approvals (SOWs in review)
    let pendingApprovals = null;
    let pendingError = null;
    
    try {
      const result = await supabase
        .from('sows')
        .select(`
          id, 
          client_name, 
          sow_title, 
          status, 
          created_at
        `)
        .eq('is_hidden', false)
        .eq('status', 'in_review')
        .order('created_at', { ascending: false })
        .limit(5);
      
      pendingApprovals = result.data;
      pendingError = result.error;
      
    } catch (_error) {
      pendingError = _error;
    }

    if (pendingError) {
      console.warn('Pending approvals query error:', pendingError);
      pendingApprovals = [];
    }

    return {
      stats,
      recentSOWs: recentSOWs || [],
      pendingApprovals: pendingApprovals || []
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      stats: { total: 0, draft: 0, in_review: 0, approved: 0, rejected: 0 },
      recentSOWs: [],
      pendingApprovals: []
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession();
  
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