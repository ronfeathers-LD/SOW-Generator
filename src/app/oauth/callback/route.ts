import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const { data: driveConfig, error } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !driveConfig) {
      return NextResponse.json({ error: 'Google Drive config not found' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      driveConfig.client_id,
      driveConfig.client_secret,
      'http://localhost:3000/oauth/callback' // This matches the route path
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens (especially refresh_token) to verify client works
    const { error: updateError } = await supabase
      .from('google_drive_configs')
      .update({
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || driveConfig.refresh_token || null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', driveConfig.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to store tokens' }, { status: 500 });
    }

    return NextResponse.redirect(new URL('/admin/google-drive?oauth=success', request.url));
  } catch (e) {
    console.error('OAuth callback error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'OAuth callback failed' },
      { status: 500 }
    );
  }
}
