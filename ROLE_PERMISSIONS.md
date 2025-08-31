# Role-Based Access Control (RBAC) Permissions Matrix

## 🎯 **Role Structure Overview**

The system uses a **dual-role system**:
- **`role` field**: Primary role ('user', 'manager', 'admin')
- **`role` field**: Primary role ('user', 'manager', 'pmo', 'admin')

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

### **2. Manager (`role = 'manager')**
**Access Level**: Team Leadership
**Navigation**: Dashboard, SOWs, Manager Portal

**Permissions**:
- ✅ All Regular User permissions
- ✅ Access Manager Portal (`/manager`)
- ✅ View team SOWs and metrics
- ✅ Approve/reject SOWs under review
- ✅ Access team management functions
- ✅ View team reports
- ❌ Cannot access PM Director portal
- ❌ Cannot access admin functions
- ❌ Cannot manage system configuration

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

### **4. Administrator (`role = 'admin')**
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

---

## 🔄 **Role Combinations & Access**

### **Role Hierarchy**:
1. **`user`** → Basic user with SOW access
2. **`manager`** → Team oversight + basic access
3. **`pmo`** → Project management oversight + basic access
4. **`admin`** → Full system access

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
| `manager` | ✅ | ✅ | ❌ | ✅ | ❌ |
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
  role TEXT CHECK (role IN ('user', 'manager', 'pmo', 'admin')),
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

// Check if user is Manager
const isManager = session.user.role === 'manager';

// Check if user is Admin
const isAdmin = session.user.role === 'admin';
```

---

## 🎯 **Best Practices**

1. **Principle of Least Privilege**: Users get minimum access needed
2. **Role Separation**: Clear boundaries between different access levels
3. **Audit Trail**: All role changes and access attempts logged
4. **Regular Review**: Periodic access review and cleanup
5. **Documentation**: Keep this matrix updated as permissions evolve
