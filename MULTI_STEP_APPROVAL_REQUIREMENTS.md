# Multi-Step Approval Requirements

## Overview

This document outlines the requirements for implementing a multi-step approval workflow for SOWs, using three stages: **Professional Services**, **Project Management**, and **Sr. Leadership**.

## Approval Stages

### 1. Professional Services (Stage 1)
- **Name:** Professional Services
- **Description:** Professional Services team review and approval
- **Sort Order:** 1
- **Focus Areas:**
  - Deliverables review
  - Resource allocation and capacity
  - Service methodology validation
  - Skill set requirements
- **Typical Approvers:** Professional Services leads, Solution Architects

### 2. Project Management (Stage 2) - CONDITIONAL
- **Name:** Project Management
- **Description:** Project Management review and approval
- **Sort Order:** 2
- **CONDITIONAL ROUTING:** Only included if SOW meets PM hour designation
  - Criteria: 3+ products OR 100+ total units
  - **Regardless of whether PM hours were removed via PM hours removal request**
- **Focus Areas:**
  - Project scope validation
  - Timeline feasibility
  - Resource planning
  - Risk assessment
  - PM hours allocation
- **Typical Approvers:** PMO team members
- **Why Conditional:** Not all SOWs require project management oversight

### 3. Sr. Leadership (Stage 3)
- **Name:** Sr. Leadership
- **Description:** Senior Leadership final approval
- **Sort Order:** 3
- **Focus Areas:**
  - Strategic alignment
  - Budget approval
  - Client relationship review
  - Final sign-off before client presentation
- **Typical Approvers:** VP/Director level executives

## Workflow Rules

### Sequential Processing (with Conditional Routing)
- **Flow:** Stage 1 → Stage 2 (if PM hours exist) → Stage 3 → Approved
- Stages **must** be completed in order
- Cannot skip to later stages until previous stage is approved
- Any rejection returns SOW to `draft` status
- **IMPORTANT:** Stage 2 (Project Management) is CONDITIONAL - only included if SOW meets PM hour designation

### Status Transitions
```
draft → submitted → awaiting_approval_stage_1 
  → approved_stage_1 → awaiting_approval_stage_2 
  → approved_stage_2 → awaiting_approval_stage_3 
  → approved_stage_3 → fully_approved (ready for client)
  
Any stage rejection → draft
```

### SOW Status Field Values
Add new status values to the SOW status enum:
- `awaiting_approval` (general)
- `awaiting_pro_services` (Stage 1 pending)
- `awaiting_pm` (Stage 2 pending)
- `awaiting_sr_leadership` (Stage 3 pending)
- `fully_approved` (all stages complete, ready for client signature)

## Role Assignment Strategy

**Final Decision: Role-Based Assignment**

Each stage has designated roles that can approve:

- **Professional Services Stage (Stage 1):**
  - `role = 'manager'` (**PS Manager** - primary approver)
  - `role = 'admin'` (override)
  - *Note:* Sales, pro_services, and solution_consultant can create/edit SOWs but cannot approve*
  
- **Project Management Stage (Stage 2):**
  - `role = 'pmo'` (PMO team members - primary approver)
  - `role = 'admin'` (override)
  
- **Sr. Leadership Stage (Stage 3):**
  - `role = 'manager'` (Senior leadership)
  - `role = 'admin'` (override)

**New User Roles Added:**
- `sales` - Sales team members, can create SOWs but not approve
- `pro_services` - PS team members, can create/edit SOWs, add comments, but not approve
- `solution_consultant` - Solution architects, can review technical requirements but not approve

**Role Hierarchy for Approvals:**
- Only PS Manager (`manager` role) can approve Stage 1
- Only PMO team (`pmo` role) can approve Stage 2  
- Only Sr. Leadership (`manager` or `admin` role) can approve Stage 3
- Admins can approve any stage as override

## Database Schema

### Existing Tables (Already in Schema)
```sql
approval_stages (
  id, name, description, sort_order, is_active
)

sow_approvals (
  id, sow_id, stage_id, status, approver_id, 
  comments, approved_at, rejected_at
)

approval_audit_log (
  id, sow_id, user_id, action, previous_status, 
  new_status, comments, metadata
)

approval_comments (
  id, sow_id, user_id, comment, is_internal, 
  parent_id, version
)
```

### New Fields Needed in `approval_stages`
```sql
ALTER TABLE approval_stages ADD COLUMN IF NOT EXISTS 
  required_roles TEXT[] DEFAULT '{}', -- e.g., ['manager'] for PS stage, ['pmo'] for PM stage
  approval_method TEXT DEFAULT 'role_based', -- 'role_based' (always)
  auto_assign BOOLEAN DEFAULT false,
  requires_comments BOOLEAN DEFAULT false,
  approval_timeout INTEGER, -- hours until escalation
  allows_parallel BOOLEAN DEFAULT false; -- sequential only for now
```

**Default Role Assignments:**
```sql
-- Professional Services Stage
UPDATE approval_stages SET required_roles = ARRAY['manager'] 
WHERE name = 'Professional Services';

-- Project Management Stage  
UPDATE approval_stages SET required_roles = ARRAY['pmo'] 
WHERE name = 'Project Management';

-- Sr. Leadership Stage
UPDATE approval_stages SET required_roles = ARRAY['manager'] 
WHERE name = 'Sr. Leadership';
```

## API Requirements

### New Endpoints

#### 1. Initialize Approval Workflow
```
POST /api/sow/[id]/approvals/initiate
```
- Creates `sow_approvals` records for all active stages
- Sets first stage to `pending`
- Sets SOW status to `awaiting_pro_services`
- Returns workflow summary

#### 2. Get Approval Status
```
GET /api/sow/[id]/approvals
```
- Returns all stages for the SOW with their status
- Includes current stage, pending stage, completed stages
- Shows who can approve next
- Returns completion percentage

#### 3. Approve Stage
```
PUT /api/sow/[id]/approvals/[stageId]/approve
Body: { comments?: string }
```
- Validates user has permission for this stage
- Updates `sow_approvals` record
- Moves to next stage (or completes workflow)
- Sends notifications
- Logs audit trail

#### 4. Reject Stage
```
PUT /api/sow/[id]/approvals/[stageId]/reject
Body: { comments: string } (required)
```
- Sets SOW back to `draft` status
- Logs rejection reason
- Notifies SOW author
- Optionally sends to slack

#### 5. Add Comment to Stage
```
POST /api/sow/[id]/approvals/[stageId]/comments
Body: { comment: string, is_internal?: boolean }
```
- Allows questions/discussion before approval
- Supports @mentions for notifications
- Threaded comments

## UI Requirements

### SOW Display Page Enhancements

#### 1. Approval Progress Indicator
Visual component showing:
- [x] Professional Services - Approved by John Doe (Jan 15)
- [x] Project Management - Approved by Jane Smith (Jan 16)
- [ ] Sr. Leadership - Awaiting approval

Progress bar: 66% complete (2 of 3 stages)

#### 2. Stage Approval Component
For approvers who can approve current stage:
- Stage name and description
- SOW context (title, client, key details)
- Approve/Reject buttons
- Comment field (required for rejection)
- View previous approvals
- View audit trail

#### 3. Admin Configuration Interface
- CRUD for approval stages
- Role assignments per stage
- Enable/disable stages
- Reorder stages
- Set timeout/escalation rules

## Notification Requirements

### Slack Notifications
For each stage:
- **Stage Started:** Notify approvers that SOW needs their review
- **Stage Approved:** Notify next stage approvers + SOW author
- **Stage Rejected:** Notify SOW author + stage approver
- **All Stages Complete:** Celebrate notification to SOW author

Notification format (using existing `sendApprovalNotification`):
```typescript
await slackService.sendApprovalNotification(
  sowId,
  sowTitle,
  clientName,
  stageName, // "Professional Services"
  approverName,
  action, // 'approved' | 'rejected' | 'skipped'
  comments,
  mentions
);
```

### Email Notifications
- Send to approvers when stage becomes pending
- Send to SOW author on each stage completion
- Send summary when fully approved or rejected

## Business Logic Rules

### 1. Stage Progression
```typescript
// When a stage is approved
async function approveStage(sowId, stageId, approverId, comments) {
  // 1. Validate permission
  await validateApproverPermission(stageId, approverId);
  
  // 2. Update sow_approvals record
  await updateApprovalStatus(stageId, 'approved', approverId, comments);
  
  // 3. Check if more stages remain
  const nextStage = await getNextActiveStage(sowId);
  
  if (nextStage) {
    // 4. Activate next stage
    await activateStage(sowId, nextStage.id);
    // 5. Notify next stage approvers
    await notifyStageApprovers(sowId, nextStage.id);
  } else {
    // 6. All stages complete - mark SOW as fully approved
    await markSOWFullyApproved(sowId);
    await notifyComplete(sowId);
  }
}
```

### 2. Stage Rejection
```typescript
async function rejectStage(sowId, stageId, approverId, comments) {
  // 1. Update sow_approvals to rejected
  await updateApprovalStatus(stageId, 'rejected', approverId, comments);
  
  // 2. Return SOW to draft
  await updateSOWStatus(sowId, 'draft');
  
  // 3. Log rejection to audit trail
  await logRejection(sowId, stageId, approverId, comments);
  
  // 4. Notify SOW author
  await notifyAuthorOfRejection(sowId, stageId, comments);
}
```

### 3. Permission Validation
```typescript
async function validateApproverPermission(stageId, userId) {
  const stage = await getStage(stageId);
  const user = await getUser(userId);
  
  // Check role-based permission
  const hasRolePermission = stage.required_roles.includes(user.role);
  
  // Check if admin override allowed
  const hasAdminOverride = user.role === 'admin';
  
  if (!hasRolePermission && !hasAdminOverride) {
    throw new Error('User does not have permission to approve this stage');
  }
}
```

## Migration Plan

### Phase 1: Schema Updates
1. ✅ Update default stages in `supabase-schema.sql`
2. ✅ Update help page documentation
3. Add new fields to `approval_stages` table (role assignments, etc.)
4. Create migration to update existing `approval_stages` records

### Phase 2: API Development
1. Create approval workflow service
2. Build stage initialization logic
3. Build stage progression logic
4. Build permission validation
5. Build notification system
6. Create API endpoints

### Phase 3: UI Development
1. Build approval progress indicator
2. Build stage approval component
3. Build admin configuration interface
4. Update SOW status display
5. Add workflow visualization

### Phase 4: Integration & Testing
1. Integrate Slack notifications
2. Integrate email notifications
3. Test role-based permissions
4. Test stage progression
5. Test rejection flow
6. Test audit logging

## Configuration Examples

### Stage Configuration
```sql
-- Professional Services Stage
INSERT INTO approval_stages (name, description, sort_order, required_roles) 
VALUES ('Professional Services', 'PS team review', 1, ARRAY['user','admin']);

-- Project Management Stage  
INSERT INTO approval_stages (name, description, sort_order, required_roles)
VALUES ('Project Management', 'PM review', 2, ARRAY['pmo','manager','admin']);

-- Sr. Leadership Stage
INSERT INTO approval_stages (name, description, sort_order, required_roles)
VALUES ('Sr. Leadership', 'Executive approval', 3, ARRAY['manager','admin']);
```

## Open Questions

1. **Can stages be skipped?** 
   - Recommendation: Yes, by admin only

2. **Can stages run in parallel?**
   - Recommendation: No, sequential only (simpler)

3. **What happens if approver is unavailable?**
   - Recommendation: Set timeout, escalate to admin

4. **Can SOW be edited during approval?**
   - Recommendation: No, once submitted, return to draft if rejected

5. **Should changes trigger re-approval?**
   - Recommendation: Yes, if critical fields change

6. **Can past approvals be reversed?**
   - Recommendation: Yes, by admin only, with audit trail

## Success Criteria

1. ✅ SOW submission creates approval workflow
2. ✅ Each stage has appropriate role-based permissions
3. ✅ Sequential progression through stages
4. ✅ Notifications sent at each stage
5. ✅ Audit trail for all actions
6. ✅ UI clearly shows approval status
7. ✅ Admin can configure stages
8. ✅ Rejection returns to draft
9. ✅ Complete approval marks SOW ready for client

