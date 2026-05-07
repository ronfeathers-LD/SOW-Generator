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
 * Check if an SOW requires PM approval
 * PM approval is required when the SOW has any Project Manager hours.
 * EXCEPTION: If PM hours have been waived (pm_hours_requirement_disabled = true),
 * PM approval is NOT required.
 */
interface PricingRoleEntry {
  role?: string;
  totalHours?: number | string;
}

type PricingRolesField =
  | Array<PricingRoleEntry>
  | { roles?: Array<PricingRoleEntry> }
  | null
  | undefined;

function extractPricingRolesArray(field: PricingRolesField): PricingRoleEntry[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (Array.isArray(field.roles)) return field.roles;
  return [];
}

export function requiresPMApproval(sow: {
  products?: string[];
  pricing_roles?: PricingRolesField;
  pm_hours_requirement_disabled?: boolean;
}): boolean {
  // If PM hours have been waived, PM approval is not required
  if (sow.pm_hours_requirement_disabled === true) {
    return false;
  }

  const roles = extractPricingRolesArray(sow.pricing_roles);
  const pmRole = roles.find(r => r.role === 'Project Manager');
  const pmHoursRaw = pmRole?.totalHours;
  const pmHours = typeof pmHoursRaw === 'number'
    ? pmHoursRaw
    : typeof pmHoursRaw === 'string'
      ? parseFloat(pmHoursRaw) || 0
      : 0;

  return pmHours > 0;
}

/**
 * Determine which approval stages are required for a given SOW
 * Returns array of stage configurations in order
 */
export async function getRequiredApprovalStages(sow: {
  products?: string[];
  pricing_roles?: PricingRolesField;
  pm_hours_requirement_disabled?: boolean;
}): Promise<ApprovalStageConfig[]> {
  const stages: ApprovalStageConfig[] = [];

  // Stage 1: Professional Services (ALWAYS REQUIRED)
  stages.push({
    stage_id: 'professional-services', // Will match the actual stage ID from DB
    name: 'Professional Services',
    required: true,
  });

  // Stage 2: Project Management (CONDITIONAL - only if PM hours exist and haven't been waived)
  const needsPMApproval = requiresPMApproval(sow);
  if (needsPMApproval) {
    stages.push({
      stage_id: 'project-management',
      name: 'Project Management',
      required: true,
      reason: 'SOW includes Project Manager hours',
    });
  } else {
    const reason = sow.pm_hours_requirement_disabled
      ? 'PM hours have been waived for this SOW'
      : 'SOW has no Project Manager hours';
    stages.push({
      stage_id: 'project-management',
      name: 'Project Management',
      required: false,
      reason: reason,
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
    products?: string[];
    pricing_roles?: PricingRolesField;
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

