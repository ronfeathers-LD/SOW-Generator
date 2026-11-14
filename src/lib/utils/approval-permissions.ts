/**
 * Approval Permission Check Functions
 * Determine if a user can approve specific stages in the approval workflow
 */

/**
 * Check if user can approve Professional Services stage (Stage 1)
 * Approvers: PS Manager (manager role) or Admin
 */
function canApproveProfessionalServicesStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

/**
 * Check if user can approve Project Management stage (Stage 2)
 * Approvers: PMO team (pmo role) or Admin
 */
function canApproveProjectManagementStage(userRole: string): boolean {
  return userRole === 'pmo' || userRole === 'admin';
}

/**
 * Check if user can approve Sr. Leadership stage (Stage 3)
 * Approvers: Sr. Leadership (manager role) or Admin
 */
function canApproveSrLeadershipStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
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

