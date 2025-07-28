# Supabase Migration Guide

This guide explains how to migrate from Prisma to Supabase for the SOW Generator application.

## Overview

We've migrated from Prisma (with PostgreSQL) to Supabase for the following reasons:
- Simpler deployment process
- No complex build issues on Vercel
- Better reliability and easier maintenance
- Built-in authentication and real-time features

## Migration Steps

### 1. Set up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key
3. Add these environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands from `supabase-schema.sql` to create all tables

### 3. Update Environment Variables in Vercel

1. Go to your Vercel project settings
2. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Deploy

The application should now deploy successfully without Prisma-related errors.

## Database Schema Changes

### Table Names
- `SOW` → `sows`
- `User` → `users`
- `Comment` → `comments`
- `SalesforceConfig` → `salesforce_configs`
- `LeanDataSignator` → `lean_data_signators`
- `AvomaConfig` → `avoma_configs`

### Field Names
All field names have been converted from camelCase to snake_case:
- `companyLogo` → `company_logo`
- `clientName` → `client_name`
- `sowTitle` → `sow_title`
- `clientTitle` → `client_title`
- `clientEmail` → `client_email`
- `signatureDate` → `signature_date`
- `projectDescription` → `project_description`
- `startDate` → `start_date`
- `clientRoles` → `client_roles`
- `pricingRoles` → `pricing_roles`
- `billingInfo` → `billing_info`
- `accessRequirements` → `access_requirements`
- `travelRequirements` → `travel_requirements`
- `workingHours` → `working_hours`
- `testingResponsibilities` → `testing_responsibilities`
- `opportunityId` → `opportunity_id`
- `opportunityName` → `opportunity_name`
- `opportunityAmount` → `opportunity_amount`
- `opportunityStage` → `opportunity_stage`
- `opportunityCloseDate` → `opportunity_close_date`
- `clientSignerName` → `client_signer_name`

## API Changes

### SOW Operations
- `prisma.sOW.create()` → `supabase.from('sows').insert()`
- `prisma.sOW.findUnique()` → `supabase.from('sows').select().eq('id', id).single()`
- `prisma.sOW.findMany()` → `supabase.from('sows').select()`
- `prisma.sOW.update()` → `supabase.from('sows').update().eq('id', id)`
- `prisma.sOW.delete()` → `supabase.from('sows').delete().eq('id', id)`

### Error Handling
Supabase returns errors in a different format:
```typescript
const { data, error } = await supabase.from('sows').select();
if (error) {
  console.error('Supabase error:', error);
  // Handle error
}
```

## Benefits of Supabase

1. **Simpler Deployment**: No complex build processes or Prisma client generation issues
2. **Better Performance**: Built-in connection pooling and optimization
3. **Real-time Features**: Built-in real-time subscriptions
4. **Authentication**: Built-in auth system (if needed in the future)
5. **Dashboard**: Easy-to-use web interface for database management
6. **Backups**: Automatic backups and point-in-time recovery

## Troubleshooting

### Common Issues

1. **Environment Variables**: Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. **Schema**: Ensure all tables are created using the provided SQL schema
3. **Permissions**: Check that Row Level Security (RLS) policies are set up correctly

### Migration from Existing Data

If you have existing data in your Prisma database:

1. Export your data from the old database
2. Transform the field names from camelCase to snake_case
3. Import the data into Supabase using the SQL Editor or Supabase dashboard

## Next Steps

1. Test all API endpoints to ensure they work with Supabase
2. Update any remaining Prisma references in the codebase
3. Consider implementing Supabase Auth if authentication is needed
4. Set up monitoring and alerts in Supabase dashboard 