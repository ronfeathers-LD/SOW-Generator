# Production Migration Instructions for PM Hours Removal Feature

## Overview

Yes, we need to run migrations in production! The changes we made were only applied to the local Supabase instance. The production database still has the old, incomplete schema.

## Migration File Created

✅ **Migration File**: `supabase/migrations/006_fix_pm_hours_removal_schema.sql`

This migration adds all the missing columns and tables that the PM Hours Removal feature needs.

## Options for Applying to Production

### Option 1: Using Supabase CLI (Recommended)

1. **Link to your project** (if not already linked):
   ```bash
   supabase link --project-ref tjpxwgbuzjgsyjvszmdg
   ```

2. **Apply the migration**:
   ```bash
   supabase db push
   ```

3. **Verify the migration**:
   ```bash
   supabase db diff
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/tjpxwgbuzjgsyjvszmdg
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/006_fix_pm_hours_removal_schema.sql`
4. Execute the migration

### Option 3: Direct Database Connection

If you have direct database access:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.tjpxwgbuzjgsyjvszmdg.supabase.co:5432/postgres" -f supabase/migrations/006_fix_pm_hours_removal_schema.sql
```

## What the Migration Does

### 1. Adds Missing Columns to `pm_hours_removal_requests`:
- `pm_director_id` - References the PM Director user
- `current_pm_hours` - Current PM hours in the SOW
- `requested_pm_hours` - Requested PM hours (usually 0 for removal)
- `hours_to_remove` - Hours to be removed
- `approval_comments` - Comments from approver
- `financial_impact` - Calculated financial impact

### 2. Adds Missing Columns to `pm_hours_removal_comments`:
- `updated_at` - Timestamp for updates
- `parent_id` - For threaded comments
- `is_internal` - Internal vs external comments

### 3. Adds PM Hours Removal Columns to `sows`:
- `pm_hours_removed` - Hours removed from SOW
- `pm_hours_removal_approved` - Approval status
- `pm_hours_removal_date` - When removal was approved
- `pm_hours_requirement_disabled` - Whether PM hours requirement is disabled
- `pm_hours_requirement_disabled_date` - When requirement was disabled
- `pm_hours_requirement_disabled_requester_id` - Who requested the removal
- `pm_hours_requirement_disabled_approver_id` - Who approved the removal

### 4. Creates `pm_hours_audit_log` Table:
- Complete audit trail for all PM hours removal actions
- Tracks who did what and when

### 5. Adds Indexes and Triggers:
- Performance indexes for better query performance
- Triggers for automatic timestamp updates

## After Migration

Once the migration is applied:

1. **Switch back to production environment**:
   ```bash
   mv .env.remote .env
   ```

2. **Test the feature** in production to ensure everything works

3. **Monitor** for any issues

## Rollback Plan

If something goes wrong, you can rollback by:
1. Dropping the added columns
2. Dropping the audit log table
3. Reverting the code changes

## Verification

After applying the migration, verify by:
1. Checking that all columns exist in the database
2. Testing PM hours removal request creation
3. Testing approval/rejection workflow
4. Testing dashboard functionality

## Important Notes

- ⚠️ **Backup**: Consider backing up the production database before applying
- ⚠️ **Testing**: Test thoroughly after applying the migration
- ⚠️ **Monitoring**: Watch for any errors or issues after deployment
- ✅ **Safe**: The migration uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so it's safe to run multiple times

## Status

- ✅ Migration file created
- ⏳ Ready to apply to production
- ⏳ Need to switch back to production environment after migration
