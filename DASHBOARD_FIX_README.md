# Dashboard Fix - What Was Wrong and How to Fix It

## Issues Found

Your dashboard was experiencing several database-related issues that prevented it from loading properly:

### 1. Missing Database Fields
- **`is_hidden` field**: The dashboard was trying to query `sows.is_hidden` but this field didn't exist in the database
- **`sow_title` field**: The code was looking for `sow_title` but the database had `title`

### 2. Missing Database Tables
- **`approval_stages` table**: The dashboard was trying to join with this table for pending approvals
- **`sow_approvals` table**: This table was missing entirely, causing the pending approvals section to fail

### 3. Schema Mismatches
- Field name inconsistencies between the database schema and the application code
- Missing foreign key relationships for the approval system

## What Was Fixed

### 1. Updated Database Schema (`supabase-schema.sql`)
- Added `is_hidden BOOLEAN DEFAULT false` to the `sows` table
- Renamed `title` to `sow_title` for consistency
- Added `approval_stages` table with default stages
- Added `sow_approvals` table for tracking approval workflow
- Added proper triggers, indexes, and RLS policies

### 2. Improved Error Handling (`src/app/dashboard/page.tsx`)
- Added better error logging for debugging
- Improved fallback error handling
- Added console warnings for database query failures

### 3. Created Migration Script (`dashboard-fix-migration.sql`)
- Safe migration script to update existing databases
- Handles both new installations and existing data
- Includes data cleanup and default values

## How to Apply the Fix

### Option 1: Use the Migration Script (Recommended)
1. Run the migration script against your Supabase database:
   ```sql
   -- Copy and paste the contents of dashboard-fix-migration.sql
   -- into your Supabase SQL editor and run it
   ```

### Option 2: Manual Database Updates
1. Add the missing `is_hidden` field:
   ```sql
   ALTER TABLE sows ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
   ```

2. Rename the title field:
   ```sql
   ALTER TABLE sows RENAME COLUMN title TO sow_title;
   ```

3. Create the missing tables (see the migration script for full details)

### Option 3: Fresh Database Setup
1. Use the updated `supabase-schema.sql` file for new installations
2. This includes all the fixes and proper table structures

## What the Dashboard Will Show After the Fix

### 1. SOW Status Overview
- Total count of all SOWs
- Breakdown by status (Draft, In Review, Approved, Rejected)
- Link to view all SOWs

### 2. Recent SOWs
- List of the 5 most recently created SOWs
- Shows title, client name, status, and view link

### 3. Pending Approvals (Admin Only)
- List of SOWs waiting for approval
- Shows approval stage and SOW details
- Direct links to review and approve

### 4. Quick Actions
- Create New SOW button
- Admin tools (if user has admin role)

## Testing the Fix

After applying the migration:

1. **Check the browser console** for any remaining errors
2. **Verify SOW counts** are displaying correctly
3. **Test the Recent SOWs section** shows actual data
4. **Check Pending Approvals** (if you have admin access)
5. **Test navigation** to other parts of the application

## Common Issues After Fix

### 1. Empty Dashboard
- Check if you have any SOWs in the database
- Verify the `is_hidden` field is set to `false` for visible SOWs

### 2. Permission Errors
- Ensure RLS policies are properly applied
- Check user authentication and role assignments

### 3. Missing Data
- Verify the `sow_title` field has content
- Check that approval stages were created successfully

## Support

If you continue to experience issues after applying these fixes:

1. Check the browser console for error messages
2. Verify the database migration completed successfully
3. Check Supabase logs for any database errors
4. Ensure all required environment variables are set

The dashboard should now load properly and display your SOW data with full functionality!
