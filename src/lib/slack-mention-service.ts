import { getSlackService } from './slack';
import { parseCommentMentions, MentionedUser } from './mention-utils';
import { SlackUserLookupService, SlackUser } from './slack-user-lookup';
import { SlackService } from './slack';
import { getEmailService } from './email';
import { createServerSupabaseClient } from './supabase-server';
import { filterValidLeandataEmails, logInvalidEmailWarning } from './utils/email-domain-validation';
import { getSOWUrl } from './utils/app-url';

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
    commentAuthor: string
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
      let botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        // Try to get bot token from database
        try {
          const { createServiceRoleClient } = await import('./supabase-server');
          const supabase = createServiceRoleClient();
          
          const { data: slackConfig } = await supabase
            .from('slack_config')
            .select('bot_token')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          botToken = slackConfig?.bot_token;
        } catch (error) {
          console.warn('Failed to get bot token from database:', error);
        }
      }
      
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
        sowUrl: getSOWUrl(sowId)
      };

      // Send Slack notification
      const slackSuccess = await this.sendSlackMentionNotification(notification, slackService);

      // Send email notifications
      try {
        await this.sendEmailMentionNotifications(notification);
      } catch (emailError) {
        console.error('Error sending email mention notifications:', emailError);
        // Don't fail the Slack notification if email fails
      }

      return slackSuccess;

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
            

          } else {

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
   * Test the Slack user lookup functionality
   */
  static async testUserLookup(username: string): Promise<{
    success: boolean;
    user?: SlackUser;
    error?: string;
  }> {
    try {
      let botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        // Try to get bot token from database
        try {
          const { createServiceRoleClient } = await import('./supabase-server');
          const supabase = createServiceRoleClient();
          
          const { data: slackConfig } = await supabase
            .from('slack_config')
            .select('bot_token')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          botToken = slackConfig?.bot_token;
        } catch (error) {
          console.warn('Failed to get bot token from database:', error);
        }
      }
      
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

  /**
   * Send email notifications to mentioned users
   */
  private static async sendEmailMentionNotifications(
    notification: CommentMentionNotification
  ): Promise<void> {
    try {
      // Get email service
      const emailService = await getEmailService();
      if (!emailService) {
        console.log('Email service not configured - skipping email notifications');
        return;
      }

      // Get Supabase client
      const supabase = await createServerSupabaseClient();

      // Get user details for mentioned users using their email addresses
      const userEmails = notification.mentionedUsers
        .map(u => u.email)
        .filter(email => email) as string[];

      if (userEmails.length === 0) {
        console.log('No valid email addresses found for mentioned users');
        return;
      }

      // Filter to only @leandata.com email addresses
      const validLeandataEmails = filterValidLeandataEmails(userEmails);
      
      // Log warnings for invalid emails
      const invalidEmails = userEmails.filter(email => !validLeandataEmails.includes(email));
      invalidEmails.forEach(email => logInvalidEmailWarning(email, 'mention notification'));

      if (validLeandataEmails.length === 0) {
        console.log('No @leandata.com email addresses found for mentioned users');
        return;
      }

      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('email', validLeandataEmails);

      if (!users || users.length === 0) {
        console.log('No mentioned users found in database for email notifications');
        return;
      }

      // Send email to each mentioned user
      const emailPromises = users.map(user => 
        emailService.sendMentionNotification(
          notification.sowTitle,
          notification.clientName,
          notification.commentText,
          notification.commentAuthor,
          user.email,
          user.name || user.email,
          notification.sowUrl
        )
      );

      await Promise.all(emailPromises);
      console.log(`Sent email mention notifications to ${users.length} users`);
    } catch (error) {
      console.error('Error sending email mention notifications:', error);
      throw error;
    }
  }
}
