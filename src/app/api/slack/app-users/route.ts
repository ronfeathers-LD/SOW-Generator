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
    
    // Get ALL users, but prioritize those with Slack mappings
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, name, slack_user_id, slack_username, role')
      .order('name');

    if (allUsersError) {
      console.error('Error fetching all users:', allUsersError);
      return NextResponse.json({ 
        error: 'Failed to fetch users',
        users: []
      }, { status: 500 });
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ 
        users: [],
        message: 'No users found'
      });
    }

    // Sort users to prioritize those with Slack mappings
    const appUsers = allUsers.sort((a, b) => {
      const aHasSlackMapping = a.slack_user_id || a.slack_username;
      const bHasSlackMapping = b.slack_user_id || b.slack_username;
      
      // Users with Slack mappings come first
      if (aHasSlackMapping && !bHasSlackMapping) return -1;
      if (!aHasSlackMapping && bHasSlackMapping) return 1;
      
      // Within each group, sort by name
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

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

    const usersWithSlackMappings = slackUsers.filter(user => 
      user.id !== (user.profile.email?.split('@')[0] || '') // Not using email prefix as ID
    ).length;


    return NextResponse.json({ 
      users: slackUsers,
      total: slackUsers.length,
      message: `All users (${usersWithSlackMappings} with Slack mappings)`
    });

  } catch (error) {
    console.error('Error fetching app users with Slack mappings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch app users',
      users: []
    }, { status: 500 });
  }
}
