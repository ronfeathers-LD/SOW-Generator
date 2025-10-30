# Database Migration Instructions

## ⚠️ DO NOT Run the Full Schema File!

**`supabase-schema.sql` is for NEW databases only.**  
Running it on an existing database will try to recreate all tables and cause errors.

## ✅ What You Actually Need to Run

Just run this ONE migration file:

```bash
psql [your-connection-string] -f ADD_APPROVAL_STAGES.sql
```

Or if you're using Supabase CLI:

```bash
supabase db push
```

Then manually run the SQL:

```sql
-- Copy and paste this into your Supabase SQL editor:
INSERT INTO approval_stages (name, description, sort_order) VALUES
  ('Professional Services', 'Professional Services team review and approval', 1),
  ('Project Management', 'Project Management review and approval', 2),
  ('Sr. Leadership', 'Senior Leadership final approval', 3)
ON CONFLICT DO NOTHING;
```

## What This Does

✅ Adds 3 new approval stage records to your database  
✅ Safe - won't break anything existing  
✅ Idempotent - can run multiple times  
✅ No data loss  

## What This DOESN'T Do

❌ Change any existing tables  
❌ Modify any existing data  
❌ Add any constraints  
❌ Break existing functionality  

## Alternative: Using Supabase CLI

If you want to use a proper migration file:

```bash
# Place the migration file in your supabase/migrations folder
supabase/migrations/001_add_approval_stages.sql

# Then run:
supabase db push
```

## Verification

After running, verify it worked:

```sql
SELECT * FROM approval_stages ORDER BY sort_order;
```

You should see your new 3 stages added to the table.

## Rollback (if needed)

If something goes wrong:

```sql
DELETE FROM approval_stages 
WHERE name IN ('Professional Services', 'Project Management', 'Sr. Leadership');
```

