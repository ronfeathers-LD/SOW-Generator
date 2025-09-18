import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

// Fallback rates if database is not available
const FALLBACK_RATES = {
  'Onboarding Specialist': 250,
  'Project Manager': 250,
  'Technical Lead': 300,
  'Developer': 200,
  'QA Engineer': 180
};

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Try to fetch from database first
    const { data: roles, error } = await supabase
      .from('pricing_roles_config')
      .select('role_name, default_rate, is_active')
      .eq('is_active', true)
      .order('role_name', { ascending: true });

    if (error) {
      console.warn('Error fetching pricing roles from database, using fallback:', error);
      // Fall back to hardcoded rates if database is not available
      const fallbackRoles = Object.entries(FALLBACK_RATES).map(([role, rate]) => ({
        role_name: role,
        default_rate: rate,
        is_active: true
      }));
      return NextResponse.json({ roles: fallbackRoles });
    }

    // Return database results
    return NextResponse.json({ roles: roles || [] });
  } catch (error) {
    console.error('Error fetching pricing roles config:', error);
    
    // Fall back to hardcoded rates if there's any error
    const fallbackRoles = Object.entries(FALLBACK_RATES).map(([role, rate]) => ({
      role_name: role,
      default_rate: rate,
      is_active: true
    }));
    
    return NextResponse.json({ roles: fallbackRoles });
  }
}
