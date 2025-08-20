# Google Drive + Gemini AI Integration Setup

This integration combines Google Drive API with Gemini AI to provide intelligent folder search and analysis capabilities.

## 🚀 Features

- **AI-Powered Search**: Use natural language queries to search Google Drive
- **Intelligent Query Interpretation**: Gemini converts natural language to structured search parameters
- **Folder Analysis**: AI analysis of folder structures and organization
- **Smart Results**: Contextual insights about search results
- **Secure Authentication**: OAuth2-based authentication with Google

## 📋 Prerequisites

1. **Google Cloud Project** with Google Drive API enabled
2. **OAuth2 Credentials** (Client ID and Client Secret)
3. **Gemini API Key** (already configured in your system)
4. **Supabase Database** (for storing configuration)

## 🔧 Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`
5. Note down your **Client ID** and **Client Secret**

### 3. Database Setup

Run the SQL migration to create the required table:

```sql
-- Run the contents of add-google-drive-config.sql
-- This creates the google_drive_configs table with proper RLS policies
```

### 4. Install Dependencies

The required packages have been added to `package.json`:

```bash
npm install
```

**Note**: We use the `googleapis` package which provides access to all Google APIs including Google Drive.

### 5. Configuration

1. Navigate to `/admin/google-drive` in your application
2. Enter your Google OAuth2 credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Redirect URI**: Must match what you configured in Google Cloud Console
   - **Refresh Token**: Optional (see OAuth2 Flow section)

## 🔐 OAuth2 Authentication Flow

### Option 1: Manual Refresh Token (Recommended for Production)

1. Use Google's OAuth2 Playground to generate a refresh token:
   - Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
   - Set your OAuth2 credentials
   - Select "Google Drive API v3" > "List files"
   - Authorize and exchange for refresh token

2. Add the refresh token to your configuration

### Option 2: Implement Full OAuth2 Flow

For production applications, implement the complete OAuth2 flow:

1. Redirect users to Google's authorization URL
2. Handle the authorization callback
3. Exchange authorization code for access/refresh tokens
4. Store tokens securely

## 🧪 Testing the Integration

### 1. Test Connection

1. Go to the Google Drive admin page
2. Click "Test Connection" to verify your setup
3. Check for any error messages

### 2. Try the Demo

1. Navigate to `/google-drive-demo`
2. Enter natural language queries like:
   - "Find all project folders from last year"
   - "Look for SOW documents in the client folder"
   - "Search for folders containing 'implementation'"

### 3. API Endpoints

Test the API directly:

```bash
# Search for folders
curl -X POST /api/google-drive/search \
  -H "Content-Type: application/json" \
  -d '{"query": "project documents", "useAI": true}'

# Check if folder exists
curl "/api/google-drive/search?folderName=MyProject"
```

## 🔍 How It Works

### 1. Natural Language Processing

1. User enters a natural language query
2. Gemini AI interprets the query and converts it to structured parameters
3. Example: "Find all project folders from last year" becomes:
   ```json
   {
     "query": "project",
     "includeSubfolders": true,
     "maxResults": 50
   }
   ```

### 2. Google Drive Search

1. Structured parameters are used to build Google Drive API queries
2. Search is executed using Google Drive API v3
3. Results are returned with metadata (creation date, size, etc.)

### 3. AI Analysis

1. Gemini analyzes the search results
2. Provides insights about folder organization
3. Suggests improvements or identifies patterns

## 🛠️ Customization

### Modify Search Behavior

Edit `src/lib/google-drive.ts` to customize:

- Search algorithms
- Result filtering
- AI prompts for analysis
- Folder structure depth

### Add New Features

- File content analysis
- Permission checking
- Collaborative folder insights
- Integration with other AI models

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Client ID and Secret
   - Check redirect URI matches exactly
   - Ensure Google Drive API is enabled

2. **Permission Errors**
   - Verify OAuth2 scopes include Drive access
   - Check if refresh token is valid
   - Ensure proper API quotas

3. **AI Analysis Failures**
   - Verify Gemini API key is valid
   - Check API quotas and rate limits
   - Review error logs for specific issues

### Debug Mode

Enable detailed logging by checking browser console and server logs.

## 📊 API Reference

### Search Endpoint

**POST** `/api/google-drive/search`

```typescript
{
  query?: string;           // Search query
  folderName?: string;      // Specific folder name
  parentFolderId?: string;  // Parent folder ID
  useAI?: boolean;          // Enable AI features (default: true)
}
```

**Response:**
```typescript
{
  success: boolean;
  searchResults: DriveSearchResult[];
  interpretedQuery: FolderSearchQuery;
  analysis?: string;
}
```

### Check Folder Existence

**GET** `/api/google-drive/search?folderName={name}&parentFolderId={id}`

**Response:**
```typescript
{
  success: boolean;
  folderName: string;
  parentFolderId?: string;
  exists: boolean;
  timestamp: string;
}
```

## 🔒 Security Considerations

1. **OAuth2 Tokens**: Store securely, never expose in client-side code
2. **API Keys**: Use environment variables for sensitive data
3. **Rate Limiting**: Implement proper rate limiting for API calls
4. **Access Control**: Use RLS policies to control configuration access
5. **Audit Logging**: Log all API calls for security monitoring

## 📈 Performance Optimization

1. **Caching**: Implement result caching for repeated queries
2. **Pagination**: Handle large result sets efficiently
3. **Async Processing**: Use background jobs for long-running operations
4. **Connection Pooling**: Reuse Google API connections

## 🤝 Contributing

When modifying this integration:

1. Follow existing code patterns
2. Add proper error handling
3. Include TypeScript types
4. Update documentation
5. Test thoroughly with different scenarios

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review server logs for detailed error messages
3. Verify Google Cloud Console settings
4. Test with simple queries first
5. Check API quotas and rate limits

---

**Note**: This integration requires both Google Drive API and Gemini AI to be properly configured. Ensure both services are working before testing the combined functionality.
