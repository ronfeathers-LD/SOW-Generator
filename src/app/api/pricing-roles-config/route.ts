import { NextResponse } from 'next/server';

// Default rates for roles currently used in the system
const DEFAULT_RATES = {
  'Onboarding Specialist': 250,
  'Project Manager': 250,
  'Technical Lead': 300,
  'Developer': 200,
  'QA Engineer': 180
};

export async function GET() {
  try {
    const roles = Object.entries(DEFAULT_RATES).map(([role, rate]) => ({
      role_name: role,
      default_rate: rate,
      is_active: true
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching pricing roles config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing roles config' },
      { status: 500 }
    );
  }
}
