# Deployment Guide

This guide covers deploying the SOW Generator to Vercel and fixing common Prisma issues.

## Vercel Deployment

### 1. Prerequisites
- GitHub repository connected to Vercel
- Environment variables configured in Vercel dashboard
- Database accessible from Vercel

### 2. Environment Variables
Set these in your Vercel project settings:

```bash
# Database
DATABASE_URL="your-production-database-url"

# Authentication
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret"

# Google OAuth (if using)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Salesforce (if using)
SALESFORCE_USERNAME="your-salesforce-username"
SALESFORCE_PASSWORD="your-salesforce-password"
SALESFORCE_SECURITY_TOKEN="your-salesforce-security-token"
NEXT_PUBLIC_SALESFORCE_INSTANCE_URL="https://na1.salesforce.com"

# Gemini AI (if using)
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"

# Avoma (if using)
AVOMA_API_KEY="your-avoma-api-key"
AVOMA_CUSTOMER_ID="your-avoma-customer-id"
```

### 3. Build Configuration
The project is configured with:
- `package.json`: Updated build script includes `prisma generate`
- `vercel.json`: Vercel-specific configuration
- `.vercelignore`: Excludes unnecessary files

### 4. Deployment Steps
1. Push your code to GitHub
2. Vercel will automatically detect the Next.js project
3. Configure environment variables in Vercel dashboard
4. Deploy

## Fixing Prisma Issues

### Common Error: PrismaClientInitializationError

**Problem**: Prisma client is outdated because Vercel caches dependencies.

**Solution**: The build script now includes `prisma generate`:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### Additional Prisma Configuration

The `prisma/schema.prisma` includes binary targets for Vercel:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
}
```

### Database Connection

Ensure your `DATABASE_URL` in Vercel environment variables points to a production database that's accessible from Vercel's servers.

## Troubleshooting

### Build Failures
1. Check environment variables are set correctly
2. Ensure database is accessible
3. Verify Prisma schema is valid

### Runtime Errors
1. Check Vercel function logs
2. Verify database connection
3. Ensure all required environment variables are set

### Performance Issues
1. Consider using Prisma Accelerate for better database performance
2. Optimize database queries
3. Use connection pooling if needed

## Local Development

For local development, ensure you have:
1. `.env.local` file with local environment variables
2. Local database running
3. Run `npm run dev` for development server

## Production URL

After successful deployment, your production URL will be:
- `https://your-app-name.vercel.app` (if using Vercel's default domain)
- `https://your-custom-domain.com` (if using custom domain)

## Monitoring

1. **Vercel Analytics**: Monitor performance and errors
2. **Database Monitoring**: Track query performance
3. **Error Tracking**: Set up error monitoring (e.g., Sentry)

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **Database Security**: Use connection pooling and proper access controls
3. **Authentication**: Ensure proper OAuth configuration
4. **API Keys**: Rotate keys regularly and use least privilege access

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test database connectivity
4. Review Prisma documentation for specific errors 