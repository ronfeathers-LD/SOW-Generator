/**
 * Approval Workflow Rules
 * Determines which approval stages are required for a given SOW
 */

// Note: shouldAddProjectManager is available if needed for future enhancements

export interface ApprovalStageConfig {
  stage_id: string;
  name: string;
  required: boolean;
  reason?: string;
}

/**
 * Check if an SOW meets PM hour designation
 * PM hours are required when: 3+ products OR 100+ total units
 * This is independent of whether PM hours were later removed via PM hours removal request
 */
interface PricingRole {
  units?: number | string;
}

export function requiresPMApproval(sow: {
  products: string[];
  pricing_roles?: Array<PricingRole>;
  pm_hours_requirement_disabled?: boolean;
}): boolean {
  // Check if SOW would have PM hours based on business rules
  const products = sow.products || [];
  const filteredProducts = products.filter((p: string) => p !== '511f28fa-6cc4-41f9-9234-dc45056aa2d2'); // Exclude BookIt Links
  
  const has3OrMoreProducts = filteredProducts.length >= 3;
  
  // Calculate total units for all pricing roles
  const pricingRoles = sow.pricing_roles || [];
  let totalUnits = 0;
  if (Array.isArray(pricingRoles)) {
    totalUnits = pricingRoles.reduce((sum: number, role: PricingRole) => {
      const units = typeof role.units === 'number' ? role.units : 0;
      return sum + units;
    }, 0);
  }
  
  const has100OrMoreUnits = totalUnits >= 100;
  
  return has3OrMoreProducts || has100OrMoreUnits;
}

/**
 * Determine which approval stages are required for a given SOW
 * Returns array of stage configurations in order
 */
export async function getRequiredApprovalStages(sow: {
  products: string[];
  pricing_roles?: Array<PricingRole>;
  pm_hours_requirement_disabled?: boolean;
}): Promise<ApprovalStageConfig[]> {
  const stages: ApprovalStageConfig[] = [];
  
  // Stage 1: Professional Services (ALWAYS REQUIRED)
  stages.push({
    stage_id: 'professional-services', // Will match the actual stage ID from DB
    name: 'Professional Services',
    required: true,
  });
  
  // Stage 2: Project Management (CONDITIONAL - only if PM hours exist)
  const needsPMApproval = requiresPMApproval(sow);
  if (needsPMApproval) {
    stages.push({
      stage_id: 'project-management',
      name: 'Project Management',
      required: true,
      reason: 'SOW meets PM hour designation (3+ products or 100+ units)',
    });
  } else {
    stages.push({
      stage_id: 'project-management',
      name: 'Project Management',
      required: false,
      reason: 'SOW does not meet PM hour designation',
    });
  }
  
  // Stage 3: Sr. Leadership (ALWAYS REQUIRED)
  stages.push({
    stage_id: 'sr-leadership',
    name: 'Sr. Leadership',
    required: true,
  });
  
  return stages;
}

/**
 * Check if a specific stage should be included in workflow for this SOW
 */
export function shouldIncludeStage(
  stageName: string,
  sow: {
    products: string[];
    pricing_roles?: Array<PricingRole>;
    pm_hours_requirement_disabled?: boolean;
  }
): boolean {
  switch (stageName) {
    case 'Professional Services':
      return true; // Always required
    case 'Project Management':
      return requiresPMApproval(sow); // Conditional
    case 'Sr. Leadership':
      return true; // Always required
    default:
      return true;
  }
}

