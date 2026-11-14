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

### PM Hours Removal Exempts from PM Approval
If PM hours have been removed via a PM hours removal request (`pm_hours_requirement_disabled = true`), the SOW **does NOT require PMO approval**, even if it originally met the PM hour designation criteria (3+ products or 100+ units).

**Why?** The PM hours removal request itself goes through an approval process (by PM Directors), so once approved, the SOW no longer needs PM approval in the final approval workflow.

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
- **Result:** ⏭️ Skip Stage 2 (PMO), only 2 stages required
- **Why:** PM hours removal was already approved by PM Directors, so PM approval is not needed in the final workflow

## 📋 Implementation

The logic is implemented in `src/lib/approval-workflow-rules.ts`:

```typescript
export function requiresPMApproval(sow: {
  products: string[];
  pricing_roles?: Array<PricingRole>;
  pm_hours_requirement_disabled?: boolean;
}): boolean {
  // If PM hours have been removed, PM approval is not required
  if (sow.pm_hours_requirement_disabled === true) {
    return false;
  }
  
  // Check if SOW would have PM hours based on business rules
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
- **Stage 2 (PM):** Required only if SOW has 3+ products OR 100+ units **AND** PM hours have NOT been removed
- **Stage 3 (Sr. Leadership):** Always required
- **PM hours removal status:** If `pm_hours_requirement_disabled = true`, PM approval is NOT required

