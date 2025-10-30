/**
 * Approval Permission Check Functions
 * Determine if a user can approve specific stages in the approval workflow
 */

export type UserRole = 'user' | 'sales' | 'pro_services' | 'solution_consultant' | 'manager' | 'pmo' | 'admin';

/**
 * Check if user can approve Professional Services stage (Stage 1)
 * Approvers: PS Manager (manager role) or Admin
 */
export function canApproveProfessionalServicesStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

/**
 * Check if user can approve Project Management stage (Stage 2)
 * Approvers: PMO team (pmo role) or Admin
 */
export function canApproveProjectManagementStage(userRole: string): boolean {
  return userRole === 'pmo' || userRole === 'admin';
}

/**
 * Check if user can approve Sr. Leadership stage (Stage 3)
 * Approvers: Sr. Leadership (manager role) or Admin
 */
export function canApproveSrLeadershipStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

/**
 * Check if user can approve any stage (admin only)
 */
export function canApproveAnyStage(userRole: string): boolean {
  return userRole === 'admin';
}

/**
 * Check if user can approve a specific stage by stage name
 */
export function canApproveStage(stageName: string, userRole: string): boolean {
  // Admin can approve any stage
  if (userRole === 'admin') {
    return true;
  }

  switch (stageName) {
    case 'Professional Services':
      return canApproveProfessionalServicesStage(userRole);
    case 'Project Management':
      return canApproveProjectManagementStage(userRole);
    case 'Sr. Leadership':
      return canApproveSrLeadershipStage(userRole);
    default:
      return false;
  }
}

/**
 * Get the required roles for a specific stage
 */
export function getRequiredRolesForStage(stageName: string): string[] {
  switch (stageName) {
    case 'Professional Services':
      return ['manager', 'admin'];
    case 'Project Management':
      return ['pmo', 'admin'];
    case 'Sr. Leadership':
      return ['manager', 'admin'];
    default:
      return ['admin'];
  }
}

/**
 * Check if a user role is valid
 */
export function isValidRole(role: string): role is UserRole {
  const validRoles: UserRole[] = ['user', 'sales', 'pro_services', 'solution_consultant', 'manager', 'pmo', 'admin'];
  return validRoles.includes(role as UserRole);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<UserRole, string> = {
    user: 'User',
    sales: 'Sales',
    pro_services: 'Professional Services',
    solution_consultant: 'Solution Consultant',
    manager: 'PS Manager',
    pmo: 'PMO',
    admin: 'Administrator',
  };
  
  return roleNames[role as UserRole] || role;
}

/**
 * Check if user can initiate approval workflow (submit SOW for approval)
 */
export function canInitiateApprovalWorkflow(userRole: string): boolean {
  // Any authenticated user can submit SOW for approval
  return isValidRole(userRole);
}

/**
 * Check if user can view approval workflow status
 */
export function canViewApprovalWorkflow(userRole: string): boolean {
  // Any authenticated user can view approval status
  return isValidRole(userRole);
}

/**
 * Check if user can view SOW in approval workflow (not just draft)
 */
export function canViewSOWInApproval(userRole: string): boolean {
  // Any authenticated user can view SOWs that are in approval workflow
  return isValidRole(userRole);
}

