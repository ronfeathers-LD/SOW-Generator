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
   * Send SOW approval notification
   */
  async sendApprovalNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    stageName: string,
    approverName: string,
    action: 'approved' | 'rejected' | 'skipped',
    comments?: string
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

    return this.sendRichMessage(blocks);
  }

  /**
   * Send SOW status change notification
   */
  async sendStatusChangeNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string
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

    return this.sendRichMessage(blocks);
  }

  /**
   * Send SOW creation notification
   */
  async sendSOWCreationNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    createdBy: string,
    amount?: number
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

    return this.sendRichMessage(blocks);
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequestNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    stageName: string,
    approverName: string,
    amount?: number
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

    return this.sendRichMessage(blocks);
  }
}

// Create a singleton instance
let slackService: SlackService | null = null;

export function getSlackService(): SlackService | null {
  if (!slackService) {
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
  return slackService;
}

export { SlackService };
export type { SlackMessage, SlackNotificationConfig };
