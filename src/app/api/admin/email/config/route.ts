import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { secretsForSave, stripEmailConfigSecrets } from '@/lib/email-config-secrets';

// GET - Retrieve email configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
    }
    
    const { data: config, error } = await supabase
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching email config:', error);
      return new NextResponse('Failed to fetch email configuration', { status: 500 });
    }

    // Never send the stored password or API key to the browser.
    return NextResponse.json({ config: config ? stripEmailConfigSecrets(config) : null });
  } catch (error) {
    console.error('Error in email config GET:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Save email configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config = await request.json();
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email!)
      .single();

    if (user?.role !== 'admin') {
      return new NextResponse('Admin access required', { status: 403 });
    }

    // Validate required fields
    if (!config.provider || !config.from_email || !config.from_name) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // The page never receives the saved secrets, so a blank field means "keep
    // the saved one". Resolve that before validating.
    const { data: existing } = await supabase
      .from('email_config')
      .select('password, api_key')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const secrets = secretsForSave(config, existing);

    // Validate provider-specific fields
    if (config.provider === 'gmail' && (!config.username || !secrets.password)) {
      return new NextResponse('Gmail requires username and password', { status: 400 });
    }

    if (config.provider === 'smtp' && (!config.host || !config.port || !config.username || !secrets.password)) {
      return new NextResponse('SMTP requires host, port, username, and password', { status: 400 });
    }

    if (config.provider === 'sendgrid' && !secrets.api_key) {
      return new NextResponse('SendGrid requires API key', { status: 400 });
    }

    if (config.provider === 'mailgun' && !secrets.api_key) {
      return new NextResponse('Mailgun requires API key', { status: 400 });
    }

    // Deactivate all existing configs
    await supabase
      .from('email_config')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new configuration
    const { data: newConfig, error: insertError } = await supabase
      .from('email_config')
      .insert({
        provider: config.provider,
        host: config.host,
        port: config.port,
        username: config.username,
        password: secrets.password,
        api_key: secrets.api_key,
        from_email: config.from_email,
        from_name: config.from_name,
        is_active: config.is_active
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email config:', insertError);
      return new NextResponse('Failed to save email configuration', { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      config: newConfig ? stripEmailConfigSecrets(newConfig) : null,
      message: 'Email configuration saved successfully' 
    });
  } catch (error) {
    console.error('Error in email config POST:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
