interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface SlackAttachment {
  [key: string]: unknown;
}

interface SlackNotificationConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

class SlackService {
  private config: SlackNotificationConfig;

  constructor(config: SlackNotificationConfig) {
    this.config = config;
  }

  /**
   * Send a simple text message to Slack
   */
  async sendMessage(message: string, channel?: string): Promise<boolean> {
    try {
      const payload: SlackMessage = {
        text: message,
        channel: channel || this.config.channel,
        username: this.config.username || 'SOW Generator',
        icon_emoji: this.config.iconEmoji || ':memo:'
      };

      console.log('📤 Sending Slack message:', {
        webhookUrl: this.config.webhookUrl,
        channel: payload.channel,
        username: payload.username,
        messageLength: message.length
      });

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      return false;
    }
  }

  /**
   * Send a rich message with blocks for better formatting
   */
  async sendRichMessage(blocks: SlackBlock[], channel?: string): Promise<boolean> {
    try {
      const payload: SlackMessage = {
        blocks,
        channel: channel || this.config.channel,
        username: this.config.username || 'SOW Generator',
        icon_emoji: this.config.iconEmoji || ':memo:'
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending Slack rich message:', error);
      return false;
    }
  }

  /**
   * Send a message with user mentions to Slack
   * @param message The message text
   * @param mentions Array of Slack user IDs to mention (e.g., ['U123456', 'U789012'])
   * @param channel Optional channel override
   */
  async sendMessageWithMentions(message: string, mentions: string[] = [], channel?: string): Promise<boolean> {
    try {
      // Format mentions as Slack user mentions
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      const fullMessage = mentions.length > 0 ? `${mentionText} ${message}` : message;

      const payload: SlackMessage = {
        text: fullMessage,
        channel: channel || this.config.channel,
        username: this.config.username || 'SOW Generator',
        icon_emoji: this.config.iconEmoji || ':memo:'
      };



      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending Slack message with mentions:', error);
      return false;
    }
  }

  /**
   * Send SOW approval notification with optional user mentions
   */
  async sendApprovalNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    stageName: string,
    approverName: string,
    action: 'approved' | 'rejected' | 'skipped',
    comments?: string,
    mentions?: string[]
  ): Promise<boolean> {
    const actionEmoji = {
      approved: ':white_check_mark:',
      rejected: ':x:',
      skipped: ':fast_forward:'
    };

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `SOW ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*SOW:*\n${sowTitle || 'Untitled'}`
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${clientName || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Stage:*\n${stageName}`
          },
          {
            type: 'mrkdwn',
            text: `*Approver:*\n${approverName}`
          }
        ]
      }
    ];

    if (comments) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Comments:*\n${comments}`
        }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${actionEmoji[action]} SOW ${action} at ${new Date().toLocaleString()}`
        }
      ]
    });

    // Add action button to view SOW
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View SOW',
            emoji: true
          },
          style: 'primary',
          url: `${process.env.NEXT_PUBLIC_APP_URL}/sow/${sowId}`
        }
      ]
    });

    // If mentions are provided, add them to the message
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      // Add mentions as a context block
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Mentioned: ${mentionText}`
          }
        ]
      });
    }

    return this.sendRichMessage(blocks);
  }

  /**
   * Send SOW status change notification with optional user mentions
   */
  async sendStatusChangeNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    mentions?: string[]
  ): Promise<boolean> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'SOW Status Updated',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*SOW:*\n${sowTitle || 'Untitled'}`
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${clientName || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${oldStatus} → ${newStatus}`
          },
          {
            type: 'mrkdwn',
            text: `*Changed by:*\n${changedBy}`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:clock1: Status updated at ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View SOW',
              emoji: true
            },
            style: 'primary',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/sow/${sowId}`
          }
        ]
      }
    ];

    // If mentions are provided, add them to the message
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      // Add mentions as a context block
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Mentioned: ${mentionText}`
          }
        ]
      });
    }

    return this.sendRichMessage(blocks);
  }

  /**
   * Send SOW creation notification with optional user mentions
   */
  async sendSOWCreationNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    createdBy: string,
    amount?: number,
    mentions?: string[]
  ): Promise<boolean> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'New SOW Created',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*SOW:*\n${sowTitle || 'Untitled'}`
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${clientName || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Created by:*\n${createdBy}`
          },
          ...(amount ? [{
            type: 'mrkdwn',
            text: `*Amount:*\n$${amount.toLocaleString()}`
          }] : [])
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:new: SOW created at ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View SOW',
              emoji: true
            },
            style: 'primary',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/sow/${sowId}`
          }
        ]
      }
    ];

    // If mentions are provided, add them to the message
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      // Add mentions as a context block
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Mentioned: ${mentionText}`
          }
        ]
      });
    }

    return this.sendRichMessage(blocks);
  }

  /**
   * Send approval request notification with optional user mentions
   */
  async sendApprovalRequestNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    stageName: string,
    approverName: string,
    amount?: number,
    mentions?: string[]
  ): Promise<boolean> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'SOW Approval Required',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: *${approverName}* needs to approve the following SOW:`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*SOW:*\n${sowTitle || 'Untitled'}`
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${clientName || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Stage:*\n${stageName}`
          },
          ...(amount ? [{
            type: 'mrkdwn',
            text: `*Opportunity Amount:*\n$${amount.toLocaleString()}`
          }] : [])
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Review SOW',
              emoji: true
            },
            style: 'primary',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/sow/${sowId}`
          }
        ]
      }
    ];

    // If mentions are provided, add them to the message
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      // Add mentions as a context block
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Mentioned: ${mentionText}`
          }
        ]
      });
    }

    return this.sendRichMessage(blocks);
  }

  /**
   * Send a custom team message with mentions
   * Useful for general team communication, updates, or custom notifications
   */
  async sendTeamMessage(
    message: string,
    mentions: string[] = [],
    channel?: string,
    title?: string
  ): Promise<boolean> {
    try {
      const blocks: SlackBlock[] = [];
      
      // Add title if provided
      if (title) {
        blocks.push({
          type: 'header',
          text: {
            type: 'plain_text',
            text: title,
            emoji: true
          }
        });
      }

      // Add message with mentions
      const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
      const fullMessage = mentions.length > 0 ? `${mentionText} ${message}` : message;
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: fullMessage
        }
      });

      // Add timestamp
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:clock1: Sent at ${new Date().toLocaleString()}`
          }
        ]
      });

      const payload: SlackMessage = {
        blocks,
        channel: channel || this.config.channel,
        username: this.config.username || 'SOW Generator',
        icon_emoji: this.config.iconEmoji || ':memo:'
      };

      console.log('📤 Sending team message with mentions:', {
        webhookUrl: this.config.webhookUrl,
        channel: payload.channel,
        username: payload.username,
        title,
        mentions: mentions.length
      });

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending team message:', error);
      return false;
    }
  }
}

// Create a singleton instance
let slackService: SlackService | null = null;

export async function getSlackService(): Promise<SlackService | null> {
  if (!slackService) {
    try {
      // Try to get config from database first
      const { createServiceRoleClient } = await import('./supabase-server');
      const supabase = createServiceRoleClient();
      
      const { data: config, error } = await supabase
        .from('slack_config')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error reading Slack config from database:', error);
      }

      let webhookUrl = '';
      let channel = '';
      let username = 'SOW Generator';
      let iconEmoji = ':memo:';

      if (config && config.webhook_url) {
        // Use database config
        webhookUrl = config.webhook_url;
        channel = config.channel || '';
        username = config.username || 'SOW Generator';
        iconEmoji = config.icon_emoji || ':memo:';
        
        // Update environment variables for backward compatibility
        process.env.SLACK_WEBHOOK_URL = webhookUrl;
        process.env.SLACK_CHANNEL = channel;
        process.env.SLACK_USERNAME = username;
        process.env.SLACK_ICON_EMOJI = iconEmoji;
        process.env.SLACK_BOT_TOKEN = config.bot_token || '';
        process.env.SLACK_WORKSPACE_DOMAIN = config.workspace_domain || '';
      } else {
        // Fall back to environment variables
        webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
        channel = process.env.SLACK_CHANNEL || '';
        username = process.env.SLACK_USERNAME || 'SOW Generator';
        iconEmoji = process.env.SLACK_ICON_EMOJI || ':memo:';
      }

      if (!webhookUrl) {
        console.warn('SLACK_WEBHOOK_URL not configured - Slack notifications disabled');
        return null;
      }

      console.log('🔧 Slack service configuration:', {
        webhookUrl: webhookUrl ? 'SET' : 'NOT SET',
        channel: channel || 'NOT SET',
        username: username || 'NOT SET',
        iconEmoji: iconEmoji || 'NOT SET',
        source: config ? 'database' : 'environment'
      });

      slackService = new SlackService({
        webhookUrl,
        channel,
        username,
        iconEmoji
      });
    } catch (error) {
      console.error('Error initializing Slack service:', error);
      
      // Fall back to environment variables if database fails
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn('SLACK_WEBHOOK_URL not configured - Slack notifications disabled');
        return null;
      }

      slackService = new SlackService({
        webhookUrl,
        channel: process.env.SLACK_CHANNEL,
        username: process.env.SLACK_USERNAME || 'SOW Generator',
        iconEmoji: process.env.SLACK_ICON_EMOJI || ':memo:'
      });
    }
  }
  return slackService;
}

export { SlackService };
export type { SlackMessage, SlackNotificationConfig };
