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
    
    // First try to get users with Slack mappings
    let { data: appUsers, error } = await supabase
      .from('users')
      .select('id, email, name, slack_user_id, slack_username, role')
      .or('slack_user_id.not.is.null,slack_username.not.is.null')
      .order('name');

    // If no users with Slack mappings found, fall back to all users
    if (!appUsers || appUsers.length === 0) {
      console.log('No users with Slack mappings found, falling back to all users');
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .order('name');
      
      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
        return NextResponse.json({ 
          error: 'Failed to fetch users',
          users: []
        }, { status: 500 });
      }
      
      // Transform allUsers to match the expected structure by adding null Slack fields
      appUsers = allUsers?.map(user => ({
        ...user,
        slack_user_id: null,
        slack_username: null
      })) || [];
    }

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
    const slackUsers: SlackUser[] = appUsers.map(user => ({
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
