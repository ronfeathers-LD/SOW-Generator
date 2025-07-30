# Salesforce Data Migration Guide

This guide outlines the implementation of the new Salesforce data storage structure using a hybrid approach with JSONB for flexibility and performance.

## Overview

We're implementing a hybrid approach to store Salesforce data:
- **Core SOW table**: Keeps `salesforce_account_id` for quick lookups
- **Salesforce data table**: Stores detailed information in JSONB format for flexibility

## Migration Steps

### Step 1: Add Salesforce Account ID to SOW Table

Run the migration script to add the `salesforce_account_id` field:

```sql
-- Run: add-salesforce-account-id.sql
ALTER TABLE sows 
ADD COLUMN salesforce_account_id VARCHAR(32);

CREATE INDEX idx_sows_salesforce_account_id ON sows(salesforce_account_id);

COMMENT ON COLUMN sows.salesforce_account_id IS 'Salesforce Account ID (18-character unique identifier) for linking to Salesforce account records';
```

### Step 2: Create Salesforce Data Table

Run the migration script to create the new table:

```sql
-- Run: create-sow-salesforce-data-table.sql
CREATE TABLE sow_salesforce_data (
  sow_id UUID PRIMARY KEY REFERENCES sows(id) ON DELETE CASCADE,
  account_data JSONB,
  contacts_data JSONB,
  opportunity_data JSONB,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_sow_salesforce_data_account ON sow_salesforce_data USING GIN (account_data);
CREATE INDEX idx_sow_salesforce_data_contacts ON sow_salesforce_data USING GIN (contacts_data);
CREATE INDEX idx_sow_salesforce_data_opportunity ON sow_salesforce_data USING GIN (opportunity_data);
```

### Step 3: Deploy Code Changes

1. **TypeScript Types**: Deploy `src/types/salesforce.ts`
2. **API Endpoints**: Deploy `src/app/api/sow/[id]/salesforce-data/route.ts`
3. **Form Updates**: Deploy updated `src/components/SOWForm.tsx`

### Step 4: Test the Implementation

1. **Create a new SOW** and select a Salesforce account
2. **Verify data is saved** to both tables
3. **Test contact and opportunity selection**
4. **Verify data persistence** across page refreshes

## Data Structure

### Account Data (JSONB)
```json
{
  "id": "001XXXXXXXXXXXXXXX",
  "name": "Hula Truck",
  "website": "https://hulatruck.com",
  "type": "Customer",
  "owner": "Jane Doe",
  "billing_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94105",
    "country": "USA"
  },
  "industry": "Transportation",
  "phone": "555-123-4567",
  "selected_at": "2024-06-10T15:00:00Z"
}
```

### Contact Data (JSONB Array)
```json
[
  {
    "id": "003XXXXXXXXXXXXXXX",
    "first_name": "Mike",
    "last_name": "Big Trouble",
    "email": "mike@hulatruck.com",
    "title": "Senior Manager",
    "role": "primary_poc",
    "selected_at": "2024-06-10T15:05:00Z"
  }
]
```

### Opportunity Data (JSONB)
```json
{
  "id": "006XXXXXXXXXXXXXXX",
  "name": "Hula Truck Implementation",
  "amount": 50000,
  "stage_name": "Closed Won",
  "close_date": "2024-06-15",
  "description": "Implementation project for Hula Truck",
  "selected_at": "2024-06-10T15:15:00Z"
}
```

## API Endpoints

### GET `/api/sow/[id]/salesforce-data`
Retrieve Salesforce data for a SOW

### POST `/api/sow/[id]/salesforce-data`
Save complete Salesforce data for a SOW

### PATCH `/api/sow/[id]/salesforce-data`
Update specific parts of Salesforce data

## Benefits

1. **Flexibility**: Easy to add new fields without schema changes
2. **Performance**: Core queries stay fast with indexed JSONB
3. **Scalability**: Can handle multiple POCs and complex data
4. **Type Safety**: Full TypeScript support with interfaces
5. **Queryability**: PostgreSQL JSONB supports complex queries

## Example Queries

### Get SOW with Account Name
```sql
SELECT s.*, 
       (sow_data.account_data->>'name') as account_name
FROM sows s
JOIN sow_salesforce_data sow_data ON s.id = sow_data.sow_id;
```

### Find SOWs by Contact Email
```sql
SELECT s.* 
FROM sows s
JOIN sow_salesforce_data sow_data ON s.id = sow_data.sow_id
WHERE sow_data.contacts_data @> '[{"email": "mike@hulatruck.com"}]';
```

### Get All POCs for a SOW
```sql
SELECT jsonb_array_elements(sow_data.contacts_data) as contact
FROM sow_salesforce_data sow_data
WHERE sow_id = 'your-sow-id';
```

## Future Enhancements

1. **Multiple POCs**: Support for multiple contacts with different roles
2. **Data Sync**: Periodic sync with Salesforce to keep data fresh
3. **Audit Trail**: Track changes to Salesforce data over time
4. **Reporting**: Advanced reporting based on Salesforce data
5. **Integration**: Use stored data for other integrations

## Rollback Plan

If issues arise, you can rollback by:

1. **Drop the new table**:
```sql
DROP TABLE IF EXISTS sow_salesforce_data;
```

2. **Remove the account ID column**:
```sql
ALTER TABLE sows DROP COLUMN IF EXISTS salesforce_account_id;
```

3. **Revert code changes** to previous versions

## Monitoring

Monitor the following after deployment:

1. **API Performance**: Check response times for new endpoints
2. **Database Performance**: Monitor query performance with new indexes
3. **Error Rates**: Watch for errors in Salesforce data saving
4. **Data Integrity**: Verify data is being saved correctly

## Support

For issues or questions:
1. Check the application logs for error details
2. Verify database connectivity and permissions
3. Test API endpoints directly
4. Review the TypeScript types for data structure issues 