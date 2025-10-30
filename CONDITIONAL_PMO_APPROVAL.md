# Conditional PMO Approval Routing

## 🎯 Business Rule

**Project Management stage (Stage 2) is CONDITIONAL** - it only appears in the approval workflow if the SOW meets the PM hour designation criteria.

## 🔍 When PMO Stage is Required

PM hours are **designated** when a SOW has:
- **3+ products** (excluding BookIt Links)
- **OR 100+ total units**

This designation happens at SOW creation time based on the business rules, regardless of later PM hours removal requests.

## 🚫 When PMO Stage is Skipped

If a SOW doesn't meet PM hour designation:
- **Stage 1:** Professional Services ✅ (always required)
- **Stage 2:** Project Management ⏭️ (skipped)
- **Stage 3:** Sr. Leadership ✅ (always required)

**Total stages: 2**

## ✅ When PMO Stage is Required

If a SOW meets PM hour designation:
- **Stage 1:** Professional Services ✅ (always required)
- **Stage 2:** Project Management ✅ (required)
- **Stage 3:** Sr. Leadership ✅ (always required)

**Total stages: 3**

## 🤔 Important Clarifications

### PM Hours Removal Doesn't Matter
Even if PM hours were later removed via a PM hours removal request (`pm_hours_requirement_disabled = true`), if the SOW **meets the original PM hour designation criteria**, it still requires PMO approval.

**Why?** The PMO needs to review and approve the removal decision itself. They validate that:
- The PM hours were appropriate to begin with
- The removal is justified
- Alternative resource planning is in place

### Example Scenarios

**Scenario 1: Small SOW with No PM Hours**
- Products: 2 products
- Units: 50 units
- PM designation: ❌ No (needs 3+ products or 100+ units)
- **Result:** Skip Stage 2 (PMO), only 2 stages required

**Scenario 2: Large SOW with PM Hours**
- Products: 4 products
- Units: 50 units
- PM designation: ✅ Yes (has 3+ products)
- **Result:** Include Stage 2 (PMO), all 3 stages required

**Scenario 2b: Large SOW by Unit Count**
- Products: 2 products
- Units: 150 units  
- PM designation: ✅ Yes (has 100+ units)
- **Result:** Include Stage 2 (PMO), all 3 stages required

**Scenario 3: Large SOW, PM Hours Later Removed**
- Products: 5 products
- Units: 250 units
- PM designation: ✅ Yes (has 3+ products)
- PM hours removed: ✅ Yes (via removal request)
- **Result:** ✅ Still include Stage 2 (PMO), all 3 stages required
- **Why:** PMO needs to approve the removal decision

## 📋 Implementation

The logic is implemented in `src/lib/approval-workflow-rules.ts`:

```typescript
export function requiresPMApproval(sow: SOWData): boolean {
  const products = sow.products || [];
  const filteredProducts = products.filter(p => p !== BOOKIT_LINKS_ID);
  const has3OrMoreProducts = filteredProducts.length >= 3;
  
  const pricingRoles = sow.pricing_roles || [];
  const totalUnits = pricingRoles.reduce((sum, role) => sum + (role.units || 0), 0);
  const has100OrMoreUnits = totalUnits >= 100;
  
  return has3OrMoreProducts || has100OrMoreUnits;
}
```

## 🎨 User Experience

### For SOWs Without PM Hours (2-stage workflow):
```
📋 Professional Services
   └─ [Awaiting Approval]

📋 Sr. Leadership
   └─ [Not Started]
```

### For SOWs With PM Hours (3-stage workflow):
```
📋 Professional Services
   └─ [Approved ✅]

📋 Project Management (PMO)
   └─ [Awaiting Approval]

📋 Sr. Leadership
   └─ [Not Started]
```

## ✅ Summary

- **Stage 1 (PS):** Always required
- **Stage 2 (PM):** Required only if SOW has 3+ products OR 100+ units
- **Stage 3 (Sr. Leadership):** Always required
- **PM hours removal status:** Irrelevant to routing decision

