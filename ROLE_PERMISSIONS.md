# Role-Based Access Control (RBAC) Permissions Matrix

## 🎯 **Role Structure Overview**

The system uses a **role-based access control (RBAC)** with the following roles:
- **Base Roles**: 'user', 'manager', 'pmo', 'admin'
- **Specialized Roles**: 'sales', 'pro_services', 'solution_consultant'
- **Legacy Support**: Existing roles remain functional

## 📋 **Detailed Permissions by Role**

### **1. Regular User (`role = 'user')**
**Access Level**: Basic User
**Navigation**: Dashboard, SOWs

**Permissions**:
- ✅ View own SOWs
- ✅ Create new SOWs
- ✅ Edit own SOWs (Draft status only)
- ✅ Submit PM hours removal requests
- ✅ View SOW approval status
- ❌ Cannot approve/reject SOWs
- ❌ Cannot access admin functions
- ❌ Cannot access PM Director portal
- ❌ Cannot access Manager portal

---

### **2. Manager (`role = 'manager')** - Now PS Manager
**Access Level**: Professional Services Team Leadership
**Navigation**: Dashboard, SOWs, Manager Portal

**Permissions**:
- ✅ All Regular User permissions
- ✅ Access Manager Portal (`/manager`)
- ✅ View team SOWs and metrics
- ✅ Approve/reject SOWs under review
- ✅ **Approve Professional Services stage** in multi-step workflow
- ✅ Access team management functions
- ✅ View team reports
- ❌ Cannot access PM Director portal
- ❌ Cannot access admin functions
- ❌ Cannot manage system configuration

**Note**: Manager role serves as Professional Services Manager for SOW approval workflows

---

### **3. PMO (`role = 'pmo')**
**Access Level**: Project Management Leadership
**Navigation**: Dashboard, SOWs, PMO Portal

**Permissions**:
- ✅ All Regular User permissions
- ✅ Access PMO Portal (`/pmo`)
- ✅ Review PM hours removal requests
- ✅ Approve/reject PM hours removal requests
- ✅ Add comments to PM hours requests
- ✅ View PM hours audit logs
- ✅ Access PM hours dashboard
- ❌ Cannot access Manager portal
- ❌ Cannot access admin functions
- ❌ Cannot manage system configuration

**Note**: PMO is a dedicated role for project management oversight

---

### **4. Sales (`role = 'sales')**
**Access Level**: Sales Team
**Navigation**: Dashboard, SOWs

**Permissions**:
- ✅ All Regular User permissions
- ✅ Create and edit SOWs
- ✅ View sales-related SOWs
- ✅ Access Salesforce integration
- ✅ Access client information
- ❌ Cannot approve SOWs in multi-step workflow
- ❌ Cannot access admin functions
- ❌ Limited access to PMO and Manager portals

---

### **5. Professional Services (`role = 'pro_services')**
**Access Level**: PS Team Member
**Navigation**: Dashboard, SOWs

**Permissions**:
- ✅ All Regular User permissions
- ✅ Create and edit SOWs
- ✅ View PS-related SOWs and assignments
- ✅ Add comments to SOW approvals
- ✅ View PM hours and resource planning
- ❌ Cannot approve Professional Services stage (only PS Manager can)
- ❌ Cannot access admin functions

---

### **6. Solution Consultant (`role = 'solution_consultant')`
**Access Level**: Solution Architecture Team
**Navigation**: Dashboard, SOWs

**Permissions**:
- ✅ All Regular User permissions
- ✅ Create and edit SOWs
- ✅ Review technical requirements and scope
- ✅ Access Salesforce integration
- ✅ Add technical input to SOWs
- ❌ Cannot approve SOWs in multi-step workflow
- ❌ Cannot access admin functions

---

### **7. Administrator (`role = 'admin')**
**Access Level**: System Administration
**Navigation**: Dashboard, SOWs, Admin Portal, + any other portals based on flags

**Permissions**:
- ✅ All permissions from all other roles
- ✅ Access Admin Portal (`/admin`)
- ✅ Access Manager Portal (`/manager`) if needed
- ✅ Access PM Director Portal (`/pm-director`) if needed
- ✅ Full system configuration access
- ✅ User management and role assignment
- ✅ System integration management
- ✅ Audit logs and system monitoring
- ✅ Database and security management
- ✅ Approve any stage in multi-step workflow (override)

---

## 🔄 **Role Combinations & Access**

### **Role Hierarchy**:
1. **`user`** → Basic user with SOW access
2. **`sales`** → Sales team with client access
3. **`pro_services`** → PS team member
4. **`solution_consultant`** → Solution architecture team
5. **`manager`** → PS Manager, can approve PS stage
6. **`pmo`** → Project management oversight, can approve PM stage
7. **`admin`** → Full system access, can approve any stage

### **Access Inheritance**:
- **Admin** automatically gets access to all portals
- **PMO** role grants access to PMO portal
- **Manager** role grants access to Manager portal
- **User** role is the base level with no special portal access

---

## 🚪 **Portal Access Matrix**

| Role | Dashboard | SOWs | PMO | Manager | Admin |
|------|-----------|------|-----|---------|-------|
| `user` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `sales` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pro_services` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `solution_consultant` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manager` (PS Manager) | ✅ | ✅ | ❌ | ✅ | ❌ |
| `pmo` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔐 **Security Considerations**

### **Row Level Security (RLS)**:
- Users can only see their own SOWs
- Managers can see team SOWs
- PM Directors can see PM hours removal requests
- Admins can see all data

### **API Access Control**:
- All API endpoints check user permissions
- Role validation on both client and server
- Session-based authentication required

### **Navigation Protection**:
- Layout-level permission checks
- Automatic redirects for unauthorized access
- Clean separation of portal access

---

## 📝 **Implementation Notes**

### **Database Schema**:
```sql
-- Users table structure
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('user', 'sales', 'pro_services', 'solution_consultant', 'manager', 'pmo', 'admin')),
  -- ... other fields
);
```

### **NextAuth Types**:
```typescript
interface Session {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    pm_director?: boolean;
  }
}
```

### **Permission Checks**:
```typescript
// Check if user is PMO
const isPMO = session.user.role === 'pmo';

// Check if user is PS Manager (can approve PS stage)
const isPSManager = session.user.role === 'manager';

// Check if user is Admin
const isAdmin = session.user.role === 'admin';

// Check if user can approve Professional Services stage
const canApprovePS = session.user.role === 'manager' || session.user.role === 'admin';

// Check if user can approve Project Management stage
const canApprovePM = session.user.role === 'pmo' || session.user.role === 'admin';
```

---

## 🎯 **Best Practices**

1. **Principle of Least Privilege**: Users get minimum access needed
2. **Role Separation**: Clear boundaries between different access levels
3. **Audit Trail**: All role changes and access attempts logged
4. **Regular Review**: Periodic access review and cleanup
5. **Documentation**: Keep this matrix updated as permissions evolve
