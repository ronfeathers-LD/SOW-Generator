import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { maskSecret, resolveSecretInput } from '@/lib/utils/secret-mask';

// GET - Retrieve Slack configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Get configuration from database
    const { data: config, error } = await supabase
      .from('slack_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error retrieving Slack config:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    // Never return the stored secrets (bot token, webhook URL) to the browser —
    // they are masked; the save path keeps the stored value when it receives
    // the mask back, and test endpoints resolve the stored value server-side.
    // (audit #53)

    // If no config in database, fall back to environment variables
    if (!config) {
      const envConfig = {
        webhookUrl: maskSecret(process.env.SLACK_WEBHOOK_URL),
        channel: process.env.SLACK_CHANNEL || '',
        username: process.env.SLACK_USERNAME || 'SOW Generator',
        iconEmoji: process.env.SLACK_ICON_EMOJI || ':memo:',
        botToken: maskSecret(process.env.SLACK_BOT_TOKEN),
        workspaceDomain: process.env.SLACK_WORKSPACE_DOMAIN || '',
        isEnabled: !!process.env.SLACK_WEBHOOK_URL
      };
      return NextResponse.json(envConfig);
    }

    // Transform database fields to frontend format
    const frontendConfig = {
      webhookUrl: maskSecret(config.webhook_url),
      channel: config.channel || '',
      username: config.username || 'SOW Generator',
      iconEmoji: config.icon_emoji || ':memo:',
      botToken: maskSecret(config.bot_token),
      workspaceDomain: config.workspace_domain || '',
      isEnabled: config.is_enabled ?? true
    };

    return NextResponse.json(frontendConfig);
  } catch (error) {
    console.error('Error retrieving Slack config:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST - Update Slack configuration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 400 });
    }

    const config = await request.json();

    const supabase = createServiceRoleClient();

    // The GET handler returns masked secrets, and the admin form round-trips
    // them on save. Resolve masked/blank values back to the stored secret so
    // saving without re-typing a secret never overwrites it with the mask.
    // (audit #53)
    let storedWebhookUrl: string | undefined;
    let storedBotToken: string | undefined;
    try {
      const { data: storedRows } = await supabase
        .from('slack_config')
        .select('webhook_url, bot_token')
        .order('id', { ascending: false })
        .limit(1);
      storedWebhookUrl = storedRows?.[0]?.webhook_url || undefined;
      storedBotToken = storedRows?.[0]?.bot_token || undefined;
    } catch {
      // Table may not exist yet — fall back to env below.
    }

    const resolvedWebhookUrl = resolveSecretInput(
      config.webhookUrl,
      storedWebhookUrl ?? process.env.SLACK_WEBHOOK_URL
    );
    const resolvedBotToken = resolveSecretInput(
      config.botToken,
      storedBotToken ?? process.env.SLACK_BOT_TOKEN
    );

    // Validate required fields (after resolution, so a masked value counts
    // as "configured" rather than being persisted literally)
    if (!resolvedWebhookUrl) {
      return new NextResponse('Webhook URL is required', { status: 400 });
    }

    // First check if the slack_config table exists
    try {
      const { error: tableCheckError } = await supabase
        .from('slack_config')
        .select('id')
        .limit(1);
      
      if (tableCheckError && tableCheckError.code === '42P01') { // Table doesn't exist
        console.error('slack_config table does not exist. Please run the database migration first.');
        
        // For now, just return success but warn that config isn't persisted
        console.warn('Saving config to environment variables instead of database');
        
        // Update environment variables for the current session
        process.env.SLACK_WEBHOOK_URL = resolvedWebhookUrl;
        process.env.SLACK_CHANNEL = config.channel || '';
        process.env.SLACK_USERNAME = config.username || 'SOW Generator';
        process.env.SLACK_ICON_EMOJI = config.iconEmoji || ':memo:';
        process.env.SLACK_BOT_TOKEN = resolvedBotToken || '';
        process.env.SLACK_WORKSPACE_DOMAIN = config.workspaceDomain || '';

        return NextResponse.json({
          success: true,
          message: 'Configuration saved to environment variables (database table not found - run migration to persist)',
          warning: 'Configuration is not persisted. Please run the database migration (add-slack-config-table.sql) to enable persistent storage.',
          config: {
            webhookUrl: maskSecret(resolvedWebhookUrl),
            channel: config.channel,
            username: config.username,
            iconEmoji: config.iconEmoji,
            botToken: maskSecret(resolvedBotToken),
            workspaceDomain: config.workspaceDomain,
            isEnabled: config.isEnabled
          }
        });
      }
    } catch (error) {
      console.error('Error checking table existence:', error);
      return new NextResponse(
        'Database connection error. Please ensure the slack_config table exists.', 
        { status: 500 }
      );
    }
    
    // Transform frontend format to database format
    const dbConfig = {
      webhook_url: resolvedWebhookUrl,
      channel: config.channel || null,
      username: config.username || 'SOW Generator',
      icon_emoji: config.iconEmoji || ':memo:',
      bot_token: resolvedBotToken || null,
      workspace_domain: config.workspaceDomain || null,
      is_enabled: config.isEnabled ?? true,
      updated_at: new Date().toISOString()
    };

    // Check if config exists
    const { data: existingConfig, error: selectError } = await supabase
      .from('slack_config')
      .select('id')
      .limit(1);

    if (selectError) {
      console.error('Error checking existing config:', selectError);
      return new NextResponse(`Database error: ${selectError.message}`, { status: 500 });
    }

    let result;
    if (existingConfig && existingConfig.length > 0) {
      // Update existing config
      result = await supabase
        .from('slack_config')
        .update(dbConfig)
        .eq('id', existingConfig[0].id)
        .select();
    } else {
      // Insert new config
      result = await supabase
        .from('slack_config')
        .insert(dbConfig)
        .select();
    }

    if (result.error) {
      console.error('Error saving Slack config:', result.error);
      console.error('Database error details:', {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint
      });
      return new NextResponse(`Failed to save configuration: ${result.error.message}`, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        webhookUrl: maskSecret(dbConfig.webhook_url),
        channel: dbConfig.channel,
        username: dbConfig.username,
        iconEmoji: dbConfig.icon_emoji,
        botToken: maskSecret(dbConfig.bot_token),
        workspaceDomain: dbConfig.workspace_domain,
        isEnabled: dbConfig.is_enabled
      }
    });
  } catch (error) {
    console.error('Error updating Slack config:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
