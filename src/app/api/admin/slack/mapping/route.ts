import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SlackUserMappingService } from '@/lib/slack-user-mapping-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get mapping statistics
    const stats = await SlackUserMappingService.getMappingStats();
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Slack mapping statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting Slack mapping stats:', error);
    return NextResponse.json(
      { error: 'Failed to get mapping statistics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'bulk-update') {
      // Get Slack bot token from database or environment
      let botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        const { createServiceRoleClient } = await import('@/lib/supabase-server');
        const supabase = createServiceRoleClient();
        
        const { data: slackConfig } = await supabase
          .from('slack_config')
          .select('bot_token')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        botToken = slackConfig?.bot_token;
      }
      
      if (!botToken) {
        return NextResponse.json(
          { error: 'Slack bot token not configured' },
          { status: 400 }
        );
      }

      SlackUserMappingService.initialize(botToken);
      
      // Perform bulk update
      const result = await SlackUserMappingService.bulkUpdateAllUsers();
      
      return NextResponse.json({
        success: true,
        result,
        message: `Bulk update completed: ${result.updated} updated, ${result.failed} failed`
      });

    } else if (action === 'map-user') {
      const { email, slack_user_id, slack_username } = body;
      
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      // Get Slack bot token from database or environment
      let botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        const { createServiceRoleClient } = await import('@/lib/supabase-server');
        const supabase = createServiceRoleClient();
        
        const { data: slackConfig } = await supabase
          .from('slack_config')
          .select('bot_token')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        botToken = slackConfig?.bot_token;
      }
      
      if (!botToken) {
        return NextResponse.json(
          { error: 'Slack bot token not configured' },
          { status: 400 }
        );
      }

      SlackUserMappingService.initialize(botToken);

      if (slack_user_id && slack_username) {
        // Manual mapping with provided Slack details
        const success = await SlackUserMappingService.mapUserAtLogin(email);
        
        if (success) {
          return NextResponse.json({
            success: true,
            message: `Successfully mapped ${email} to Slack user ${slack_username}`
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `Failed to map ${email} to Slack`
          }, { status: 400 });
        }
      } else {
        // Auto-mapping by email only
        try {
          const mapping = await SlackUserMappingService.findSlackUserByEmail(email);
          
          if (mapping) {
            // Update the user's Slack mapping
            const supabase = await import('@/lib/supabase-server').then(m => m.createServerSupabaseClient());
            
            const { error } = await supabase
              .from('users')
              .update({
                slack_user_id: mapping.slack_user_id,
                slack_username: mapping.slack_username,
                slack_mapping_updated_at: new Date().toISOString()
              })
              .eq('email', email);

            if (error) {
              throw new Error(`Database update failed: ${error.message}`);
            }

            return NextResponse.json({
              success: true,
              mapping: {
                slack_user_id: mapping.slack_user_id,
                slack_username: mapping.slack_username,
                email: mapping.email
              },
              message: `Successfully auto-mapped ${email} to Slack user @${mapping.slack_username}`
            });
          } else {
            return NextResponse.json({
              success: false,
              error: `No Slack user found with email: ${email}`
            }, { status: 404 });
          }
        } catch (error) {
          console.error('Error auto-mapping user:', error);
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to auto-map user'
          }, { status: 500 });
        }
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "bulk-update" or "map-user"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in Slack mapping admin endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to perform Slack mapping operation' },
      { status: 500 }
    );
  }
}
