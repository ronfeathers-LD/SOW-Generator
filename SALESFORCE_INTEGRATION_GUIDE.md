# Salesforce Integration Guide

## Overview

The SOW Generator now includes Salesforce integration to automatically pull customer information and populate the SOW form. This feature allows administrators to configure Salesforce credentials once, and then all users can search for customers without needing to enter credentials.

## Features

- **Admin-Configured**: Credentials managed securely by administrators
- **Customer Search**: Search for accounts by company name
- **Contact Information**: Automatically retrieve contact details for selected accounts
- **Auto-Population**: Fill customer information fields automatically
- **Secure Authentication**: Support for both username/password and OAuth2 authentication
- **Role-Based Access**: Only admins can configure Salesforce settings

## Setup Instructions

### 1. Admin User Setup

First, you need to set up an admin user. Run the following command with your email:

```bash
node scripts/setup-admin.js your-email@company.com
```

This will create or update a user with admin privileges.

### 2. Salesforce Credentials

You'll need the following Salesforce credentials:
- **Username**: Your Salesforce username
- **Password**: Your Salesforce password
- **Security Token**: Your Salesforce security token (optional, but recommended)

#### Getting Your Security Token

1. Log into Salesforce
2. Go to **Setup** → **My Personal Information** → **Reset My Security Token**
3. Click **Reset Security Token**
4. Check your email for the new security token

### 3. Configure Salesforce Integration

1. Log into the application with your admin account
2. You'll see an **Admin Panel** bar at the top of the page
3. Click **"Salesforce Config"** in the admin panel
4. Fill in your Salesforce credentials:
   - Choose Production or Sandbox environment
   - Enter your username and password
   - Optionally enter your security token
   - Enable the integration
5. Click **"Test Connection"** to verify your credentials
6. Click **"Save Configuration"** to store the settings

## How to Use

### 1. Access the Integration

1. Navigate to the SOW form (`/sow/new`)
2. Click on the **"Customer Information"** tab
3. You'll see the **Salesforce Integration** section at the top

### 2. Check Integration Status

The integration will show one of three states:

- **✅ Active**: Ready to use
- **⚠️ Not Configured**: Admin needs to set up credentials
- **❌ Disabled**: Integration is disabled or has errors

### 3. Search for Customers

1. Type a company name in the search field
2. Click **"Search"** or press Enter
3. Review the search results showing:
   - Company name
   - Billing address
   - Phone number
   - Industry

### 4. Select a Customer

1. Click on the desired customer from the search results
2. The system will automatically:
   - Retrieve contact information
   - Populate the customer name field
   - Fill in the primary contact's email
   - Set the signature name and title

### 5. Review and Edit

1. Review the auto-populated information
2. Make any necessary adjustments
3. Continue with the rest of the SOW form

## Security Considerations

### Admin-Only Configuration
- Only users with admin role can configure Salesforce credentials
- Credentials are stored securely in the database
- Regular users cannot access or modify credentials

### Development/Testing
- Admin credentials are stored in the database
- Users don't need to enter credentials for each search
- Secure role-based access control

### Production Recommendations
- Implement OAuth2 authentication instead of username/password
- Use Salesforce Connected Apps for better security
- Encrypt sensitive data in the database
- Implement proper session management
- Regular credential rotation
- Monitor access logs

## Troubleshooting

### Common Issues

1. **"Failed to authenticate with Salesforce"**
   - Check your username and password
   - Verify your security token if using one
   - Ensure you're using the correct login URL (production vs sandbox)

2. **"No accounts found"**
   - Try a broader search term
   - Check if the account exists in your Salesforce instance
   - Verify your user has access to Account records

3. **"Failed to get customer information"**
   - Check your user permissions in Salesforce
   - Ensure you have access to Contact and Opportunity records
   - Verify the account ID is valid

### Error Messages

- **Authentication errors**: Check credentials and login URL
- **Permission errors**: Verify Salesforce user permissions
- **Network errors**: Check internet connection and Salesforce availability

## API Endpoints

The integration uses two main API endpoints:

### `/api/salesforce/search-accounts`
- **Method**: POST
- **Purpose**: Search for Salesforce accounts
- **Parameters**: `searchTerm`, `username`, `password`, `securityToken`

### `/api/salesforce/customer-info`
- **Method**: POST
- **Purpose**: Get full customer information
- **Parameters**: `accountId`, `username`, `password`, `securityToken`

## Data Mapping

When a customer is selected, the following data is automatically mapped:

| Salesforce Field | SOW Form Field |
|------------------|----------------|
| Account.Name | Customer Name |
| Contact.Email | Customer Email |
| Contact.FirstName + LastName | Signature Name |
| Contact.Title | Signature Title |

## Future Enhancements

- OAuth2 authentication support
- Opportunity data integration
- Custom field mapping
- Bulk customer import
- Contact selection interface
- Address autocomplete from Salesforce data

## Support

For issues with the Salesforce integration:
1. Check the troubleshooting section above
2. Verify your Salesforce credentials and permissions
3. Review the browser console for detailed error messages
4. Contact your system administrator for Salesforce access issues 