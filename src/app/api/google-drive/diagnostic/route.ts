import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { google } from 'googleapis';

interface DiagnosticTest {
  status: 'success' | 'error' | 'warning';
  message: string;
  error?: string;
  newExpiry?: string;
  folderCount?: number;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get Google Drive configuration
    const { data: driveConfig, error: configError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !driveConfig) {
      return NextResponse.json({
        status: 'error',
        message: 'Google Drive integration is not configured',
        details: 'Please configure Google Drive in the admin panel first.',
        configExists: false
      }, { status: 400 });
    }

    const diagnostic = {
      status: 'checking',
      configExists: true,
      config: {
        hasClientId: !!driveConfig.client_id,
        hasClientSecret: !!driveConfig.client_secret,
        hasRedirectUri: !!driveConfig.redirect_uri,
        hasRefreshToken: !!driveConfig.refresh_token,
        hasAccessToken: !!driveConfig.access_token,
        tokenExpiry: driveConfig.token_expiry,
        isActive: driveConfig.is_active
      },
      tests: {} as Record<string, DiagnosticTest>
    };

    // Test 1: OAuth2 Client Creation
    try {
      new google.auth.OAuth2(
        driveConfig.client_id,
        driveConfig.client_secret,
        driveConfig.redirect_uri
      );
      diagnostic.tests.oauth2Client = { status: 'success', message: 'OAuth2 client created successfully' };
    } catch (error) {
      diagnostic.tests.oauth2Client = { 
        status: 'error', 
        message: 'Failed to create OAuth2 client',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Token Validation
    if (driveConfig.refresh_token) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          driveConfig.client_id,
          driveConfig.client_secret,
          driveConfig.redirect_uri
        );
        
        oauth2Client.setCredentials({
          refresh_token: driveConfig.refresh_token
        });

        // Try to get a new access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        diagnostic.tests.tokenRefresh = { 
          status: 'success', 
          message: 'Token refresh successful',
          newExpiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'No expiry'
        };
      } catch (error) {
        diagnostic.tests.tokenRefresh = { 
          status: 'error', 
          message: 'Token refresh failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      diagnostic.tests.tokenRefresh = { 
        status: 'warning', 
        message: 'No refresh token available'
      };
    }

    // Test 3: Drive API Initialization
    try {
      new GoogleDriveService({
        clientId: driveConfig.client_id,
        clientSecret: driveConfig.client_secret,
        redirectUri: driveConfig.redirect_uri,
        refreshToken: driveConfig.refresh_token
      });
      diagnostic.tests.driveService = { status: 'success', message: 'Drive service initialized successfully' };
    } catch (error) {
      diagnostic.tests.driveService = { 
        status: 'error', 
        message: 'Failed to initialize drive service',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Basic API Call
    try {
      const oauth2Client = new google.auth.OAuth2(
        driveConfig.client_id,
        driveConfig.client_secret,
        driveConfig.redirect_uri
      );
      
      if (driveConfig.refresh_token) {
        oauth2Client.setCredentials({
          refresh_token: driveConfig.refresh_token
        });
      }

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      // Try to list root folders (this is a basic permission test)
      const response = await drive.files.list({
        q: "'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name)',
        pageSize: 1
      });

      diagnostic.tests.basicApiCall = { 
        status: 'success', 
        message: 'Basic API call successful',
        folderCount: response.data.files?.length || 0
      };
    } catch (error) {
      diagnostic.tests.basicApiCall = { 
        status: 'error', 
        message: 'Basic API call failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Determine overall status
    const errorCount = Object.values(diagnostic.tests).filter(test => test.status === 'error').length;
    const warningCount = Object.values(diagnostic.tests).filter(test => test.status === 'warning').length;
    
    if (errorCount > 0) {
      diagnostic.status = 'error';
    } else if (warningCount > 0) {
      diagnostic.status = 'warning';
    } else {
      diagnostic.status = 'success';
    }

    return NextResponse.json(diagnostic);

  } catch (error) {
    console.error('Error in Google Drive diagnostic:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
