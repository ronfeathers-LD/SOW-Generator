# Approval Role Changes Summary

## ✅ Changes Made

### 1. New User Roles Added
Added three new roles to the system:
- **`sales`** - Sales team members
- **`pro_services`** - Professional Services team members  
- **`solution_consultant`** - Solution consultants/architects

### 2. Updated Role Hierarchy
```
user → base level
sales → sales team access
pro_services → PS team member access
solution_consultant → solution architecture access
manager → PS Manager (can approve Professional Services stage)
pmo → PMO team (can approve Project Management stage)
admin → full system access
```

### 3. Multi-Step Approval Workflow

**Stage 1: Professional Services**
- Approver: `manager` role (PS Manager) or `admin`
- What they review: Deliverables, resourcing, service methodology

**Stage 2: Project Management**  
- Approver: `pmo` role or `admin`
- What they review: Project scope, timeline, PM hours, resource planning

**Stage 3: Sr. Leadership**
- Approver: `manager` role (Sr. leadership) or `admin`
- What they review: Strategic alignment, budget, final sign-off

### 4. Files Updated
- ✅ `supabase-schema.sql` - Added new roles to CHECK constraint
- ✅ `supabase-schema.sql` - Updated default approval stages to PS/PM/Sr. Leadership
- ✅ `ROLE_PERMISSIONS.md` - Added documentation for all 7 roles
- ✅ `MULTI_STEP_APPROVAL_REQUIREMENTS.md` - Updated role assignments
- ✅ `src/app/help/page.tsx` - Updated approval workflow documentation

## 📋 Implementation Tasks

### Database Migration Required
Create a migration to:
1. Add new roles to the CHECK constraint on users table
2. Update existing approval_stages if any exist
3. Add `required_roles` column to `approval_stages` table

### Code Updates Needed

#### 1. TypeScript Type Definitions
Update any TypeScript files that define user roles:
```typescript
type UserRole = 'user' | 'sales' | 'pro_services' | 'solution_consultant' | 'manager' | 'pmo' | 'admin';
```

#### 2. Permission Check Functions
Create functions to check approval permissions:
```typescript
function canApprovePSStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}

function canApprovePMStage(userRole: string): boolean {
  return userRole === 'pmo' || userRole === 'admin';
}

function canApproveSRLStage(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin';
}
```

#### 3. Admin User Management
Update admin user management UI to support assigning new roles:
- Add role dropdown with all 7 roles
- Update role descriptions in UI
- Add role-specific permission indicators

### 4. Approval Workflow Service
Create new service to handle multi-step approval logic:
- Check which stage is pending
- Validate user has permission for that stage
- Move to next stage when approved
- Handle rejection flow

## 🎯 Next Steps

1. **Database Migration** - Run migration to add new roles
2. **Update Existing Users** - Assign appropriate roles to existing users
3. **Implement Approval Workflow** - Build API endpoints and UI
4. **Testing** - Test role-based permissions
5. **Documentation** - Update help docs with new workflow

## 🔍 Simple Enough to Implement?

**YES** - This is straightforward because:

✅ **Database schema already supports it** - `role` field is TEXT, just needs CHECK constraint update  
✅ **No breaking changes** - Existing roles continue to work  
✅ **Clear role hierarchy** - Simple role-to-stage mapping  
✅ **Existing patterns** - Can follow PM hours removal approval pattern  
✅ **All infrastructure exists** - Notification systems, audit logging, etc.

### Estimated Complexity
- **Schema changes**: Low (already done)
- **API development**: Medium (follow existing PM hours pattern)
- **UI development**: Medium (build on existing approval components)
- **Testing**: Low-Medium (role permissions need thorough testing)

### Time Estimate
- Database setup: ✅ Done (5 min)
- API endpoints: 4-6 hours
- UI components: 6-8 hours
- Testing & integration: 4-6 hours
- **Total: ~14-20 hours**

## 💡 Key Design Decisions Made

1. **Manager role = PS Manager** - Clear naming, no ambiguity
2. **Role-based only** - No per-user assignment needed (simpler)
3. **Sequential stages** - Easy to understand, easy to implement
4. **Admin override** - Admins can approve any stage
5. **New roles for clarity** - sales, pro_services, solution_consultant can create but not approve

## 🚨 Important Notes

1. **Existing users** - Update their roles in the database as needed
2. **Manager role now dual-purpose** - Can approve both Stage 1 (PS) and Stage 3 (Sr. Leadership)
3. **Backward compatibility** - All existing role checks continue to work
4. **Admin safety** - Admins always have full access regardless of role

