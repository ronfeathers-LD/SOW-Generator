import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { google } from 'googleapis';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: driveConfig, error } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !driveConfig) {
      return NextResponse.json(
        { error: 'Google Drive integration is not configured' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      driveConfig.client_id,
      driveConfig.client_secret,
      'http://localhost:3000/oauth/callback' // Updated redirect URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',  // Allows creating and uploading files
      'https://www.googleapis.com/auth/drive.readonly',  // Allows reading existing Drive content
      'https://www.googleapis.com/auth/drive.metadata.readonly'  // Allows reading file metadata
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('OAuth start error:', error);
    return NextResponse.json(
      { error: 'Failed to create OAuth authorization URL' },
      { status: 500 }
    );
  }
}


