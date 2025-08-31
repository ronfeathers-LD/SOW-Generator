# System Functionality Audit & Access Control Matrix

## 🎯 **Overview**
This document provides a comprehensive audit of all functionality in the SOW Generator system and maps out who should have access to each discipline based on their role and responsibilities.

---

## 📊 **Core Business Functions**

### **1. SOW Management**
**Description**: Create, edit, view, and manage Statement of Work documents

**Access Control**:
- **All Users**: Create, edit own SOWs (Draft status)
- **Managers**: Approve/reject SOWs under review
- **Admins**: Full SOW management, can edit any SOW
- **PM Directors**: No special SOW management access

**Key Features**:
- SOW creation wizard
- Multi-tab editing (General, Scope, Pricing, etc.)
- Version control and changelog
- PDF generation and printing
- Salesforce integration for customer data

---

### **2. PM Hours Management**
**Description**: Request, review, and approve removal of Project Manager hours requirements

**Access Control**:
- **All Users**: Submit PM hours removal requests
- **PM Directors**: Review, approve, reject requests
- **Admins**: Review, approve, reject requests (fallback)
- **Managers**: No access to PM hours approval

**Key Features**:
- PM hours removal request form
- Approval workflow with threaded comments
- Audit trail and financial impact tracking
- Dashboard for pending requests

---

### **3. Pricing & Role Management**
**Description**: Calculate project hours, manage team roles, and set pricing

**Access Control**:
- **All Users**: View pricing, basic role information
- **Managers**: View team pricing, approve pricing changes
- **Admins**: Full pricing management, role editing
- **PM Directors**: Can edit PM role hours if approved

**Key Features**:
- Automated hour calculation based on products
- Role-based pricing (Onboarding Specialist, Developer, etc.)
- Discount management
- PM hours requirement toggle

---

## 🔧 **System Administration Functions**

### **4. User Management**
**Description**: Manage user accounts, roles, and permissions

**Access Control**:
- **Admins Only**: Full user management access
- **No other roles**: Cannot access user management

**Key Features**:
- User role assignment (user, manager, admin)
- PM Director flag management
- User statistics and activity tracking
- Slack user mapping

---

### **5. Product Management**
**Description**: Manage product catalog and pricing

**Access Control**:
- **Admins Only**: Full product management
- **All Users**: View products (read-only)

**Key Features**:
- Product CRUD operations
- Pricing configuration
- Product categorization
- Integration with pricing calculator

---

### **6. AI & Machine Learning**
**Description**: AI-powered content generation and analysis

**Access Control**:
- **Admins**: Configuration and management
- **All Users**: Use AI features in SOW creation
- **PM Directors**: No special AI access

**Key Features**:
- Gemini AI integration
- AI prompt management and versioning
- AI usage logging and monitoring
- Content generation assistance

---

### **7. Integration Management**

#### **7.1 Salesforce Integration**
**Description**: Customer data, opportunity management, billing information

**Access Control**:
- **Admins**: Configuration and testing
- **All Users**: Access customer data in SOW creation
- **Managers**: View team customer data

**Key Features**:
- Account and contact lookup
- Opportunity integration
- Billing information retrieval
- Data caching and synchronization

#### **7.2 Google Drive Integration**
**Description**: Document storage, search, and content extraction

**Access Control**:
- **Admins**: Configuration and OAuth setup
- **All Users**: Search and access documents
- **PM Directors**: No special access

**Key Features**:
- Document search and retrieval
- Content extraction from PDFs
- Folder navigation
- OAuth authentication

#### **7.3 Slack Integration**
**Description**: User lookup, notifications, team communication

**Access Control**:
- **Admins**: Configuration and user mapping
- **All Users**: Basic Slack user lookup
- **Managers**: Team Slack management

**Key Features**:
- User lookup and mapping
- Team message sending
- Bot token management
- Workspace user synchronization

#### **7.4 Avoma Integration**
**Description**: Meeting transcription and analysis

**Access Control**:
- **Admins**: Configuration and testing
- **All Users**: Access transcriptions in SOW creation
- **PM Directors**: No special access

**Key Features**:
- Meeting recording search
- Transcription retrieval
- AI analysis of meeting content
- Integration with SOW creation

---

### **8. Content Management**
**Description**: Templates, AI prompts, and content versioning

**Access Control**:
- **Admins**: Full content management
- **All Users**: Use templates and AI prompts
- **Managers**: View team templates

**Key Features**:
- SOW content templates
- AI prompt versioning
- Content change tracking
- Template customization

---

### **9. Audit & Compliance**
**Description**: System logging, changelog, and audit trails

**Access Control**:
- **Admins**: Full audit access
- **Managers**: Team activity logs
- **PM Directors**: PM hours audit logs
- **Regular Users**: Own activity logs

**Key Features**:
- User activity tracking
- SOW change history
- PM hours removal audit
- System access logs

---

## 🚪 **Portal Access Matrix**

| Functionality | User | Manager | PM Director | Admin |
|---------------|------|---------|-------------|-------|
| **SOW Creation** | ✅ Own | ✅ Own | ✅ Own | ✅ All |
| **SOW Approval** | ❌ | ✅ Team | ❌ | ✅ All |
| **PM Hours Removal** | ✅ Request | ❌ | ✅ Review | ✅ Review |
| **Pricing Management** | ✅ View | ✅ View | ✅ Limited | ✅ Full |
| **User Management** | ❌ | ❌ | ❌ | ✅ Full |
| **Product Management** | ✅ View | ✅ View | ✅ View | ✅ Full |
| **AI Configuration** | ❌ | ❌ | ❌ | ✅ Full |
| **Integration Config** | ❌ | ❌ | ❌ | ✅ Full |
| **Content Templates** | ✅ Use | ✅ Use | ✅ Use | ✅ Full |
| **Audit Logs** | ✅ Own | ✅ Team | ✅ PM Hours | ✅ All |

---

## 🔐 **Security & Access Control**

### **Row Level Security (RLS) Policies**
- **Users**: Can only see own SOWs and data
- **Managers**: Can see team SOWs and data
- **PM Directors**: Can see PM hours removal requests
- **Admins**: Can see all data

### **API Endpoint Protection**
- All endpoints validate user permissions
- Role-based access control on server side
- Session validation required for all operations

### **Navigation Protection**
- Layout-level permission checks
- Automatic redirects for unauthorized access
- Clean portal separation

---

## 📋 **Role Assignment Recommendations**

### **Regular User (`role = 'user')**
**Typical Roles**: Sales Representatives, Account Managers, Project Coordinators
**Responsibilities**: Create and manage SOWs, submit PM hours removal requests
**Access**: Basic SOW functionality, customer data access

### **Manager (`role = 'manager')**
**Typical Roles**: Sales Managers, Team Leads, Project Managers
**Responsibilities**: Team oversight, SOW approval, team reporting
**Access**: Team management, SOW approval, basic reporting

### **PM Director (`pm_director = true`)**
**Typical Roles**: Project Management Directors, Delivery Managers
**Responsibilities**: PM hours requirement management, project delivery oversight
**Access**: PM hours removal workflow, project delivery metrics

### **Administrator (`role = 'admin')**
**Typical Roles**: System Administrators, IT Managers, Operations Directors
**Responsibilities**: System configuration, user management, integration management
**Access**: Full system access, configuration management

---

## 🎯 **Implementation Guidelines**

### **1. Role Assignment Process**
1. **Identify User Responsibilities**: Map user job functions to required access
2. **Apply Principle of Least Privilege**: Start with minimal access, add as needed
3. **Document Access Rationale**: Maintain records of why users have specific roles
4. **Regular Access Review**: Periodic review of user access and roles

### **2. Access Request Workflow**
1. **User Request**: Employee requests specific access
2. **Manager Approval**: Direct manager approves access request
3. **Admin Assignment**: System admin assigns appropriate role
4. **Access Verification**: Confirm user can access required functionality
5. **Documentation**: Record access assignment and rationale

### **3. Security Monitoring**
1. **Access Logging**: Track all user access and actions
2. **Role Change Auditing**: Monitor role and permission changes
3. **Anomaly Detection**: Identify unusual access patterns
4. **Regular Reviews**: Periodic access and permission reviews

---

## 📝 **Maintenance & Updates**

### **When Adding New Features**
1. **Define Access Requirements**: Determine who needs access
2. **Update Role Matrix**: Modify access control matrix
3. **Implement RLS Policies**: Add database-level security
4. **Update UI Components**: Modify navigation and access controls
5. **Document Changes**: Update this audit document

### **When Modifying Existing Features**
1. **Assess Impact**: Determine how changes affect access control
2. **Update Permissions**: Modify role-based access as needed
3. **Test Access Controls**: Verify security still works correctly
4. **Update Documentation**: Reflect changes in this audit

---

## 🔍 **Audit Checklist**

### **Monthly Reviews**
- [ ] User role assignments current and appropriate
- [ ] PM Director assignments reflect current organizational structure
- [ ] Manager roles align with team leadership
- [ ] Admin access limited to necessary personnel

### **Quarterly Reviews**
- [ ] Access control matrix up to date
- [ ] RLS policies functioning correctly
- [ ] Integration access appropriate for roles
- [ ] Audit logs capturing all necessary information

### **Annual Reviews**
- [ ] Complete access control review
- [ ] Role structure alignment with organization
- [ ] Security policy updates
- [ ] Training and documentation updates
