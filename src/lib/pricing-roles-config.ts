export interface PricingRoleConfig {
  role_name: string;
  default_rate: number;
  is_active: boolean;
}

export async function getPricingRolesConfig(): Promise<PricingRoleConfig[]> {
  try {
    const response = await fetch('/api/pricing-roles-config');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.roles || [];
  } catch (error) {
    console.error('Failed to fetch pricing roles config:', error);
    // Fallback to hardcoded rates
    return [
      { role_name: 'Onboarding Specialist', default_rate: 250, is_active: true },
      { role_name: 'Project Manager', default_rate: 250, is_active: true },
      { role_name: 'Technical Lead', default_rate: 300, is_active: true },
      { role_name: 'Developer', default_rate: 200, is_active: true },
      { role_name: 'QA Engineer', default_rate: 180, is_active: true },
    ];
  }
}

export function getDefaultRateForRole(roleName: string, configs: PricingRoleConfig[]): number {
  const config = configs.find(c => c.role_name === roleName);
  return config?.default_rate || 250; // Default to 250 if not found
}
