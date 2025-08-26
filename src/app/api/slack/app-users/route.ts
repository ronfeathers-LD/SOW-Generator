import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SlackUser } from '@/lib/slack-user-lookup';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get only users who are registered in the app and have Slack mappings
    const { data: appUsers, error } = await supabase
      .from('users')
      .select('id, email, name, slack_user_id, slack_username, role')
      .or('slack_user_id.not.is.null,slack_username.not.is.null')
      .order('name');

    if (error) {
      console.error('Error fetching app users:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch app users',
        users: []
      }, { status: 500 });
    }

    if (!appUsers || appUsers.length === 0) {
      return NextResponse.json({ 
        users: [],
        message: 'No app users with Slack mappings found'
      });
    }

    // Transform app users to SlackUser format for consistency
    const slackUsers: SlackUser[] = appUsers
      .filter(user => user.slack_user_id || user.slack_username) // Double-check we have Slack info
      .map(user => ({
        id: user.slack_user_id || user.slack_username || user.id,
        name: user.slack_username || user.email.split('@')[0], // Fallback to email prefix
        profile: {
          display_name: user.name || user.email.split('@')[0],
          real_name: user.name || user.email.split('@')[0],
          email: user.email
        },
        is_bot: false, // App users are never bots
        deleted: false // App users are never deleted
      }));

    console.log(`Returning ${slackUsers.length} app users with Slack mappings`);

    return NextResponse.json({ 
      users: slackUsers,
      total: slackUsers.length,
      message: 'App users with Slack mappings'
    });

  } catch (error) {
    console.error('Error fetching app users with Slack mappings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch app users',
      users: []
    }, { status: 500 });
  }
}
