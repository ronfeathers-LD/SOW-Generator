# Diagnosing the Approval Workflow Issue

## The Problem
SOW shows "0 of 0 stages completed" even though it has PM hours and should have a workflow.

## Root Cause Analysis

### 1. When Does Workflow Initialize?
The workflow initialization code (lines 406-426 in `src/app/api/sow/[id]/route.ts`) ONLY runs when:
```typescript
if (data.status === 'in_review')
```

This means:
- ✅ If you submit a NEW SOW → Workflow initializes
- ❌ If a SOW is ALREADY in review → Workflow does NOT initialize

### 2. The Likely Scenarios

**Scenario A: SOW was already in review before workflow code was added**
- SOW was submitted when workflow code didn't exist
- Workflow was never initialized
- No approval records exist in `sow_approvals` table

**Scenario B: Workflow initialization failed silently**
- The code catches errors but doesn't fail the submission
- Something went wrong during initialization
- Check server logs for errors

### 3. How to Verify

Run this SQL to see if approval records exist:
```sql
SELECT 
  s.id, 
  s.sow_title, 
  s.status, 
  COUNT(sa.id) as approval_count
FROM sows s
LEFT JOIN sow_approvals sa ON sa.sow_id = s.id
WHERE s.status = 'in_review'
GROUP BY s.id, s.sow_title, s.status;
```

If `approval_count = 0`, the workflow was never initialized.

## The Fix

### Option 1: Re-submit the SOW (Recommended)
1. Change SOW status from `in_review` to `draft`
2. Submit it for review again
3. Workflow will initialize properly

### Option 2: Manually initialize (Quick fix)
Run `FIX_MISSING_WORKFLOW.sql` to create the missing approval records

### Option 3: Auto-initialize on load (Better long-term)
Add logic to check if a workflow exists when loading a SOW in review, and initialize if missing.

## Why This Happens

The workflow initialization is **event-driven** (triggers on status change), not **on-demand** (checks on load). This means:
- New submissions work perfectly ✅
- Old submissions that predate the feature need manual intervention ❌

## Recommendations

1. **Short-term**: Use Option 1 or 2 above to fix the current SOW
2. **Long-term**: Consider adding auto-initialization logic when loading a SOW in review

