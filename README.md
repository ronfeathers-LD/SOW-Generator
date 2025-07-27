# SOW Generator

A Next.js application for generating Statements of Work (SOW) with Salesforce integration.

## Features

- Create and edit SOW documents
- Salesforce integration for customer and opportunity lookup
- Rich text editing capabilities
- PDF generation
- Admin panel for configuration

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Salesforce
SALESFORCE_USERNAME="your-salesforce-username"
SALESFORCE_PASSWORD="your-salesforce-password"
SALESFORCE_SECURITY_TOKEN="your-salesforce-security-token"
SALESFORCE_LOGIN_URL="https://login.salesforce.com"

# Salesforce Instance URL (for record links)
NEXT_PUBLIC_SALESFORCE_INSTANCE_URL="https://your-instance.salesforce.com"
```

### Salesforce Instance URL Configuration

The `NEXT_PUBLIC_SALESFORCE_INSTANCE_URL` environment variable is used to generate direct links to Salesforce records. This allows users to quickly verify selected accounts, contacts, and opportunities in Salesforce.

- **Production**: Set this to your production Salesforce instance URL (e.g., `https://na1.salesforce.com`)
- **Sandbox**: Set this to your sandbox instance URL (e.g., `https://test.salesforce.com`)
- **Development**: If not set, defaults to `https://na1.salesforce.com`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Navigate to the SOW creation page
2. Use the Customer Information tab to search and select customers from Salesforce
3. Select opportunities associated with the chosen account
4. Fill in the remaining SOW details
5. Generate and download the PDF

## Admin Features

- Configure Salesforce integration settings
- Manage LeanData signators
- View and manage SOW documents 