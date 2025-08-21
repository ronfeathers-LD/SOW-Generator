import { getSlackService } from './slack';
import { parseCommentMentions, MentionedUser } from './mention-utils';
import { SlackUserLookupService, SlackUser } from './slack-user-lookup';
import { SlackService } from './slack';

export interface CommentMentionNotification {
  sowId: string;
  sowTitle: string;
  clientName: string;
  commentText: string;
  commentAuthor: string;
  mentionedUsers: MentionedUser[];
  sowUrl: string;
}

/**
 * Service for handling Slack notifications when users are @mentioned in SOW comments
 * Now uses Slack's Web API for dynamic user lookup
 */
export class SlackMentionService {
  /**
   * Send Slack notifications for @mentions in a comment
   */
  static async sendMentionNotifications(
    commentText: string,
    sowId: string,
    sowTitle: string,
    clientName: string,
    commentAuthor: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ): Promise<boolean> {
    try {
      // Check if comment has mentions
      const mentionedUsers = parseCommentMentions(commentText);
      if (mentionedUsers.length === 0) {
        return true; // No mentions, nothing to do
      }

      // Get Slack service
      const slackService = await getSlackService();
      if (!slackService) {
        console.warn('Slack service not configured - cannot send mention notifications');
        return false;
      }

      // Initialize Slack user lookup service
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        console.warn('SLACK_BOT_TOKEN not configured - cannot lookup users for mentions');
        return false;
      }
      SlackUserLookupService.initialize(botToken);

      // Look up user details and Slack IDs for mentioned users
      const enrichedUsers = await this.enrichMentionedUsers(mentionedUsers);
      const usersWithSlackIds = enrichedUsers.filter(user => user.slackUserId);

      if (usersWithSlackIds.length === 0) {
        console.log('No mentioned users found in Slack workspace');
        return true;
      }

      // Prepare notification data
      const notification: CommentMentionNotification = {
        sowId,
        sowTitle: sowTitle || 'Untitled SOW',
        clientName: clientName || 'Unknown Client',
        commentText,
        commentAuthor,
        mentionedUsers: usersWithSlackIds,
        sowUrl: `${baseUrl}/sow/${sowId}`
      };

      // Send Slack notification
      return await this.sendSlackMentionNotification(notification, slackService);

    } catch (error) {
      console.error('Error sending mention notifications:', error);
      return false;
    }
  }

  /**
   * Enrich mentioned users with their Slack details using Slack API
   */
  private static async enrichMentionedUsers(mentionedUsers: MentionedUser[]): Promise<MentionedUser[]> {
    try {
      const enrichedUsers: MentionedUser[] = [];

      for (const user of mentionedUsers) {
        try {
          // Try to lookup user by username first
          let lookupResult = await SlackUserLookupService.lookupUserByUsername(user.username);
          
          if (!lookupResult.success) {
            // If username lookup fails, try to construct email and lookup by email
            // This assumes the username might be part of an email address
            const possibleEmails = [
              `${user.username}@${process.env.SLACK_WORKSPACE_DOMAIN || 'company.com'}`,
              user.username // In case it's already a full email
            ];

            for (const email of possibleEmails) {
              lookupResult = await SlackUserLookupService.lookupUserByEmail(email);
              if (lookupResult.success) break;
            }
          }

          if (lookupResult.success && lookupResult.user) {
            const slackUser = lookupResult.user;
            enrichedUsers.push({
              username: user.username,
              email: slackUser.profile.email,
              slackUserId: slackUser.id,
              fullName: slackUser.profile.real_name || slackUser.profile.display_name || slackUser.name
            });
            
            console.log(`✅ Found Slack user for @${user.username}: ${slackUser.name} (${slackUser.id})`);
          } else {
            console.log(`❌ Could not find Slack user for @${user.username}: ${lookupResult.error}`);
            // Keep the user even if not found in Slack
            enrichedUsers.push(user);
          }

        } catch (lookupError) {
          console.error(`Error looking up user @${user.username}:`, lookupError);
          // Keep the user even if lookup fails
          enrichedUsers.push(user);
        }
      }

      return enrichedUsers;

    } catch (error) {
      console.error('Error enriching mentioned users:', error);
      return mentionedUsers;
    }
  }

  /**
   * Send the actual Slack notification for mentions
   */
  private static async sendSlackMentionNotification(
    notification: CommentMentionNotification,
    slackService: SlackService
  ): Promise<boolean> {
    try {
      const { sowTitle, clientName, commentText, commentAuthor, mentionedUsers, sowUrl } = notification;

      // Extract Slack user IDs for mentions
      const slackUserIds = mentionedUsers
        .map(user => user.slackUserId)
        .filter(id => id) as string[];

      // Create the message
      const message = ` You were mentioned in a comment on SOW: *${sowTitle}*\n\n` +
        `*Client:* ${clientName}\n` +
        `*Comment by:* ${commentAuthor}\n\n` +
        `> ${commentText}\n\n` +
        `🔗 <${sowUrl}|View SOW>`;

      // Send to the default channel with mentions
      const success = await slackService.sendMessageWithMentions(
        message,
        slackUserIds
      );

      if (success) {
        console.log(`✅ Sent mention notifications for SOW ${notification.sowId} to ${slackUserIds.length} users`);
      } else {
        console.error(`❌ Failed to send mention notifications for SOW ${notification.sowId}`);
      }

      return success;

    } catch (error) {
      console.error('Error sending Slack mention notification:', error);
      return false;
    }
  }

  /**
   * Get only users from Slack workspace who are in our system
   * This is much more efficient than fetching all workspace users
   */
  static async getSystemSlackUsers(): Promise<SlackUser[]> {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        throw new Error('SLACK_BOT_TOKEN not configured');
      }

      // Get users from our database who have Slack IDs
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: systemUsers, error } = await supabase
        .from('users')
        .select('email, slack_user_id')
        .not('slack_user_id', 'is', null);

      if (error) {
        console.error('Error fetching system users:', error);
        throw error;
      }

      if (!systemUsers || systemUsers.length === 0) {
        return [];
      }

      // Initialize Slack service
      SlackUserLookupService.initialize(botToken);
      
      // Fetch only the specific users we need from Slack
      const slackUsers: SlackUser[] = [];
      
      for (const systemUser of systemUsers) {
        try {
          // Try to get user by Slack ID first (most efficient)
          if (systemUser.slack_user_id) {
            const user = await SlackUserLookupService.getUserById(systemUser.slack_user_id);
            if (user) {
              slackUsers.push(user);
              continue;
            }
          }
          
          // Fallback: try by email if Slack ID lookup failed
          if (systemUser.email) {
            const result = await SlackUserLookupService.lookupUserByEmail(systemUser.email);
            if (result.success && result.user) {
              slackUsers.push(result.user);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch Slack user for ${systemUser.email}:`, error);
          // Continue with other users
        }
      }

      return slackUsers;

    } catch (error) {
      console.error('Error fetching system Slack users:', error);
      throw error;
    }
  }

  /**
   * Get all users from Slack workspace (for admin interfaces)
   * @deprecated Use getSystemSlackUsers() instead for better performance
   */
  static async getSlackWorkspaceUsers(): Promise<SlackUser[]> {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        throw new Error('SLACK_BOT_TOKEN not configured');
      }

      SlackUserLookupService.initialize(botToken);
      return await SlackUserLookupService.getAllUsers();

    } catch (error) {
      console.error('Error fetching Slack workspace users:', error);
      throw error;
    }
  }

  /**
   * Test the Slack user lookup functionality
   */
  static async testUserLookup(username: string): Promise<{
    success: boolean;
    user?: SlackUser;
    error?: string;
  }> {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return {
          success: false,
          error: 'SLACK_BOT_TOKEN not configured'
        };
      }

      SlackUserLookupService.initialize(botToken);
      return await SlackUserLookupService.lookupUserByUsername(username);

    } catch (error) {
      console.error('Error testing user lookup:', error);
      return {
        success: false,
        error: 'Lookup test failed'
      };
    }
  }

  /**
   * Validate Slack bot token
   */
  static async validateSlackToken(): Promise<boolean> {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return false;
      }

      SlackUserLookupService.initialize(botToken);
      return await SlackUserLookupService.validateToken();

    } catch (error) {
      console.error('Error validating Slack token:', error);
      return false;
    }
  }
}
