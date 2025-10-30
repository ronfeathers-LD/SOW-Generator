# Multi-Step Approval Implementation Plan

## ✅ Completed
1. Database schema updated with new approval stages
2. Documentation updated (ROLE_PERMISSIONS.md, requirements docs)
3. Help page updated with new workflow
4. Database migration run successfully

## 🚀 Next Steps

### Phase 1: Approval Workflow Service (Foundation)
Create the core service that handles workflow logic.

**File to create:** `src/lib/approval-workflow-service.ts`

**What it needs to do:**
- Initialize workflow when SOW is submitted
- Check which stage is currently pending
- Validate user permissions for each stage
- Move to next stage when approved
- Handle rejections (return to draft)
- Get approval status for a SOW

**Estimated time:** 4-6 hours

### Phase 2: API Endpoints
Create REST API endpoints for approval actions.

**Files to create:**
1. `src/app/api/sow/[id]/approvals/initiate/route.ts` - Start approval workflow
2. `src/app/api/sow/[id]/approvals/route.ts` - Get approval status
3. `src/app/api/sow/[id]/approvals/[stageId]/approve/route.ts` - Approve a stage
4. `src/app/api/sow/[id]/approvals/[stageId]/reject/route.ts` - Reject a stage

**Estimated time:** 3-4 hours

### Phase 3: UI Components
Build the user-facing components.

**Files to create:**
1. `src/components/sow/ApprovalWorkflowDisplay.tsx` - Show workflow progress
2. `src/components/sow/StageApprovalCard.tsx` - Individual stage approval UI
3. Update `src/components/sow/SOWDisplay.tsx` - Add workflow display to SOW page

**Files to update:**
1. `src/components/sow/SimpleApproval.tsx` - Either replace or make conditional
2. `src/types/sow.ts` - Add approval workflow type definitions

**Estimated time:** 6-8 hours

### Phase 4: Integration & Testing
- Update SOW submission flow to trigger approval workflow
- Add notifications
- Test all permission scenarios
- Test workflow progression

**Estimated time:** 4-6 hours

---

## 🎯 Quick Start: What to Build First

### 1. Type Definitions (30 min)
Add approval types to `src/types/sow.ts`:

```typescript
export interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface SOWApproval {
  id: string;
  sow_id: string;
  stage_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_started';
  approver_id?: string;
  comments?: string;
  approved_at?: string;
  rejected_at?: string;
  stage?: ApprovalStage;
}

export interface ApprovalWorkflowStatus {
  sow_id: string;
  current_stage?: SOWApproval;
  all_stages: SOWApproval[];
  completion_percentage: number;
}
```

### 2. Permission Check Functions (30 min)
Add to `src/lib/utils/permissions.ts`:

```typescript
export function canApproveProfessionalServicesStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

export function canApproveProjectManagementStage(userRole: string): boolean {
  return userRole === 'pmo' || userRole === 'admin';
}

export function canApproveSrLeadershipStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

export function canApproveStage(stageName: string, userRole: string): boolean {
  switch(stageName) {
    case 'Professional Services':
      return canApproveProfessionalServicesStage(userRole);
    case 'Project Management':
      return canApproveProjectManagementStage(userRole);
    case 'Sr. Leadership':
      return canApproveSrLeadershipStage(userRole);
    default:
      return userRole === 'admin';
  }
}
```

### 3. Approval Workflow Service (4-6 hours)
Create `src/lib/approval-workflow-service.ts`:

```typescript
export class ApprovalWorkflowService {
  // Initialize workflow when SOW submitted
  static async initiateWorkflow(sowId: string): Promise<void> {
    // Get all active stages
    // Create sow_approvals records for each
    // Set first stage to pending
  }

  // Get current workflow status
  static async getWorkflowStatus(sowId: string): Promise<ApprovalWorkflowStatus> {
    // Get all sow_approvals for this SOW
    // Determine current stage
    // Calculate completion percentage
  }

  // Approve a stage
  static async approveStage(
    sowId: string, 
    stageId: string, 
    approverId: string, 
    comments?: string
  ): Promise<void> {
    // Validate permissions
    // Update stage to approved
    // Move to next stage or complete
    // Send notifications
  }

  // Reject a stage
  static async rejectStage(
    sowId: string,
    stageId: string,
    approverId: string,
    comments: string
  ): Promise<void> {
    // Update stage to rejected
    // Return SOW to draft
    // Send notifications
  }
}
```

---

## 🎨 UI Components to Build

### Approval Workflow Display
Shows progress through the 3 stages:
```
✅ Professional Services - Approved by John Doe (Jan 15)
✅ Project Management - Approved by Jane Smith (Jan 16)  
⏳ Sr. Leadership - Awaiting approval
```

### Stage Approval Card
For approvers to approve/reject:
- Stage name and description
- SOW context (title, client, key details)
- Approve/Reject buttons
- Comment field (required for rejection)
- Previous stage summary

---

## 🎯 Recommended Implementation Order

1. **Today**: Build type definitions and permission checks
2. **Next Session**: Build ApprovalWorkflowService
3. **Next Session**: Build API endpoints
4. **Next Session**: Build UI components
5. **Final**: Integration and testing

Would you like me to start building any of these components?

