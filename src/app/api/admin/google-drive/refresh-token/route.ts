import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get the current Google Drive configuration
    const { data: config, error: configError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (configError) {
      console.error('Error fetching Google Drive config:', configError);
      return NextResponse.json({ 
        error: `Failed to fetch Google Drive configuration: ${configError.message}` 
      }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json({ 
        error: 'No active Google Drive configuration found. Please configure Google Drive integration first.' 
      }, { status: 404 });
    }

    if (!config.client_id || !config.client_secret || !config.refresh_token) {
      return NextResponse.json({ 
        error: 'Incomplete Google Drive configuration. Please ensure Client ID, Client Secret, and Refresh Token are configured.' 
      }, { status: 400 });
    }

    // Refresh the access token using the refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        refresh_token: config.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token refresh failed:', errorData);
      
      return NextResponse.json({ 
        error: `Failed to refresh token: ${errorData.error_description || errorData.error || 'Unknown error'}` 
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    
    // Calculate token expiry time
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Update the configuration with the new access token
    const { error: updateError } = await supabase
      .from('google_drive_configs')
      .update({
        access_token: tokenData.access_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('Error updating token in database:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save refreshed token to database' 
      }, { status: 500 });
    }

    console.log('Google Drive token refreshed successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Token refreshed successfully',
      expires_at: tokenExpiry
    });

  } catch (error) {
    console.error('Error refreshing Google Drive token:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
