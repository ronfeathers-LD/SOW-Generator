# SOW Generator

A comprehensive Statement of Work (SOW) generator with AI-powered content creation, Salesforce integration, and advanced document management.

## Features

### Rich Text Editor with Resizable Tables
The application includes a powerful TipTap-based rich text editor with the following table capabilities:

- **Resizable Columns**: Hover over any table to see blue resize handles on the right edge of each column
- **Table Controls**: Insert, delete, and modify tables with header rows
- **Keyboard Shortcuts**: Use `Ctrl+T` to quickly insert a new table
- **Smooth Interactions**: Resize handles appear on hover and provide smooth column resizing
- **Responsive Design**: Tables adapt to different screen sizes

#### How to Use Resizable Tables:
1. Click the 📊 button in the toolbar to insert a table
2. Hover over the table to see blue resize handles appear
3. Click and drag the blue handles to resize columns
4. Use the table controls to add/remove rows and columns
5. Press `Ctrl+T` for quick table insertion

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

## Production Deployment

### PDF Generation Setup

The SOW Generator uses Puppeteer for PDF generation. In production environments, you need to ensure Chrome/Chromium is available:

#### Option 1: Install System Chrome (Recommended)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# CentOS/RHEL
sudo yum install -y google-chrome-stable

# Alpine Linux
apk add --no-cache chromium
```

#### Option 2: Use Puppeteer's Bundled Chromium
The application will automatically fall back to Puppeteer's bundled Chromium if system Chrome is not available.

#### Option 3: Docker Environment
If running in Docker, use a base image with Chrome:
```dockerfile
FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies and build
COPY package*.json ./
RUN npm ci --only=production
RUN npm run build

# Start the application
CMD ["npm", "start"]
```

### Environment Variables for Production

Ensure these environment variables are set in production:

```env
# Production-specific
NODE_ENV="production"
NEXTAUTH_URL="https://your-domain.com"
DATABASE_URL="your-production-database-url"

# Google Drive (if using)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

### Troubleshooting PDF Generation

If you encounter "Failed to launch any browser" errors:

1. **Check Chrome installation**:
   ```bash
   which google-chrome-stable
   which chromium-browser
   ```

2. **Verify Puppeteer browsers**:
   ```bash
   npx puppeteer browsers list
   ```

3. **Reinstall browsers**:
   ```bash
   npm run install-chrome
   npm run install-chromium
   ```

4. **Check environment variables**:
   - Ensure `NODE_ENV=production`
   - Check if any custom Chrome paths are set

5. **Common production paths**:
   - `/usr/bin/google-chrome-stable`
   - `/usr/bin/chromium-browser`
   - `/opt/google/chrome/chrome` (some cloud environments)

6. **Force browser installation**:
   ```bash
   # Clear Puppeteer cache and reinstall
   rm -rf ~/.cache/puppeteer
   npm run postinstall
   ``` 