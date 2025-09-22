/**
 * Service for automatically mapping Slack users to app users
 * This runs at user login to keep mappings up to date
 */

import { createServerSupabaseClient } from './supabase-server';

export interface SlackUserMapping {
  email: string;
  slack_user_id: string;
  slack_username: string;
  profile: {
    display_name?: string;
    real_name?: string;
    email?: string;
  };
}

export class SlackUserMappingService {
  private static botToken: string | undefined;

  /**
   * Initialize the service with Slack bot token
   */
  static initialize(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Automatically map a user to their Slack profile at login
   * This is called when a user logs in to keep mappings current
   */
  static async mapUserAtLogin(userEmail: string): Promise<boolean> {
    try {
      if (!this.botToken) {
        console.warn('Slack bot token not configured, skipping user mapping');
        return false;
      }

      const supabase = await createServerSupabaseClient();
      
      // Check if user already has a complete mapping
      const { data: existingUser } = await supabase
        .from('users')
        .select('slack_user_id, slack_username, slack_mapping_updated_at')
        .eq('email', userEmail)
        .single();

      // If user has complete mapping and it was updated recently (within 30 days), skip
      if (existingUser?.slack_user_id && existingUser?.slack_username) {
        const lastUpdate = new Date(existingUser.slack_mapping_updated_at || 0);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (lastUpdate > thirtyDaysAgo) {
          return true;
        }
      }

      // Try to find Slack user by email
      const slackUser = await this.findSlackUserByEmail(userEmail);
      
      if (slackUser) {
        // Update the user's Slack mapping
        const { error } = await supabase
          .from('users')
          .update({
            slack_user_id: slackUser.slack_user_id,
            slack_username: slackUser.slack_username,
            slack_mapping_updated_at: new Date().toISOString()
          })
          .eq('email', userEmail);

        if (error) {
          console.error(`Failed to update Slack mapping for ${userEmail}:`, error);
          return false;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error mapping user ${userEmail} to Slack:`, error);
      return false;
    }
  }

  /**
   * Find a Slack user by email address
   */
  static async findSlackUserByEmail(email: string): Promise<SlackUserMapping | null> {
    try {
      // Import the SlackUserLookupService dynamically to avoid circular dependencies
      const { SlackUserLookupService } = await import('./slack-user-lookup');
      
      // Initialize the service
      SlackUserLookupService.initialize(this.botToken!);

      // Get all Slack users and find by email
      const allSlackUsers = await SlackUserLookupService.getAllUsers();
      
      const matchingUser = allSlackUsers.find(user => 
        user.profile.email?.toLowerCase() === email.toLowerCase()
      );

      if (matchingUser) {
        return {
          email: email,
          slack_user_id: matchingUser.id,
          slack_username: matchingUser.name,
          profile: matchingUser.profile
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding Slack user by email:', error);
      return null;
    }
  }

  /**
   * Bulk update all users with Slack mappings
   * This is useful for initial setup or periodic updates
   */
  static async bulkUpdateAllUsers(): Promise<{ updated: number; failed: number }> {
    try {
      if (!this.botToken) {
        throw new Error('Slack bot token not configured');
      }

      const supabase = await createServerSupabaseClient();
      
      // Get all users without Slack mappings
      const { data: usersWithoutMappings, error } = await supabase
        .from('users')
        .select('email')
        .or('slack_user_id.is.null,slack_username.is.null')
        .eq('is_hidden', false);

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      if (!usersWithoutMappings || usersWithoutMappings.length === 0) {
        return { updated: 0, failed: 0 };
      }

      let updated = 0;
      let failed = 0;

      // Process users in batches to avoid overwhelming the Slack API
      const batchSize = 10;
      for (let i = 0; i < usersWithoutMappings.length; i += batchSize) {
        const batch = usersWithoutMappings.slice(i, i + batchSize);
        
        for (const user of batch) {
          try {
            const success = await this.mapUserAtLogin(user.email);
            if (success) {
              updated++;
            } else {
              failed++;
            }
            
            // Add small delay between users to be respectful to Slack API
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to map user ${user.email}:`, error);
            failed++;
          }
        }
      }

      return { updated, failed };
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    }
  }

  /**
   * Get mapping statistics for admin dashboard
   */
  static async getMappingStats(): Promise<{
    total_users: number;
    mapped_users: number;
    unmapped_users: number;
    complete_mappings: number;
    partial_mappings: number;
  }> {
    try {
      const supabase = await createServerSupabaseClient();
      
      // Get total user count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', false);

      // Get mapped users count
      const { count: mappedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', false)
        .or('slack_user_id.not.is.null,slack_username.not.is.null');

      // Get complete mappings count
      const { count: completeMappings } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', false)
        .not('slack_user_id', 'is', null)
        .not('slack_username', 'is', null);

      const total = totalUsers || 0;
      const mapped = mappedUsers || 0;
      const complete = completeMappings || 0;
      const partial = mapped - complete;
      const unmapped = total - mapped;

      return {
        total_users: total,
        mapped_users: mapped,
        unmapped_users: unmapped,
        complete_mappings: complete,
        partial_mappings: partial
      };
    } catch (error) {
      console.error('Error getting mapping stats:', error);
      throw error;
    }
  }
}
