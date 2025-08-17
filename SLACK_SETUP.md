# Slack Integration Setup

This guide will help you set up Slack notifications for your SOW Generator application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#your-channel-name
SLACK_USERNAME=SOW Generator
SLACK_ICON_EMOJI=:memo:
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Steps

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Give your app a name (e.g., "SOW Generator")
5. Select your workspace

### 2. Enable Incoming Webhooks

1. In your app settings, go to "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to On
3. Click "Add New Webhook to Workspace"
4. Choose the channel where you want to receive notifications
5. Click "Allow"
6. Copy the webhook URL

### 3. Configure the App

1. Go to your SOW Generator admin panel
2. Navigate to Admin → Slack
3. Paste your webhook URL
4. Configure the default channel, username, and icon emoji
5. Save the configuration
6. Test the connection

## What Gets Notified

The Slack integration will send notifications for:

- **SOW Creation**: When a new SOW is created
- **Approval Actions**: When SOWs are approved, rejected, or skipped
- **Status Changes**: When SOW status changes
- **Approval Requests**: When someone needs to approve a SOW

## New: @Mention Functionality

### Team Messages with Mentions

You can now send team messages with @mentions directly from the admin panel:

1. Go to Admin → Slack
2. Use the "Send Team Message" section
3. Enter your message
4. Add Slack user IDs to mention (comma-separated)
5. Optionally add a title and channel override
6. Send the message

### Finding Slack User IDs

To mention users in Slack, you need their Slack user ID:

- **Right-click method**: Right-click on a user's name in Slack → "Copy link" → Extract the user ID from the URL
- **Profile method**: Go to user profile → "More" → "Copy member ID"

### Example Usage

```
Message: "Please review the latest SOW before the client meeting"
Mentions: U123456, U789012
Title: SOW Review Request
Channel: #sow-reviews
```

This will send: `@user1 @user2 Please review the latest SOW before the client meeting`

### Programmatic Usage

You can also use mentions programmatically in your code:

```typescript
import { getSlackService } from '@/lib/slack';
import { getTeamMentions, combineMentions } from '@/lib/slack-mention-utils';

const slackService = getSlackService();
if (slackService) {
  // Send to managers
  const managerMentions = getTeamMentions('MANAGERS');
  await slackService.sendTeamMessage(
    'Weekly review meeting starting in 5 minutes',
    managerMentions,
    '#meetings',
    'Meeting Reminder'
  );
  
  // Send urgent alert to entire team
  const allMentions = getTeamMentions('ALL_TEAM');
  await slackService.sendTeamMessage(
    '🚨 URGENT: System maintenance required',
    allMentions,
    '#alerts',
    'System Alert'
  );
}
```

## Notification Format

Notifications include:
- SOW title and client name
- Action taken (approve/reject/skip)
- Approver name
- Comments (if provided)
- Timestamps
- Direct links to review SOWs
- **User mentions** (when configured)

## Troubleshooting

### Common Issues

1. **Webhook URL Invalid**: Make sure the webhook URL is correct and starts with `https://hooks.slack.com/services/`
2. **Channel Not Found**: Ensure the channel exists in your workspace
3. **Permission Denied**: Make sure the webhook has access to the specified channel
4. **Rate Limiting**: Slack has rate limits; if you're sending many notifications, they might be throttled
5. **User IDs Not Working**: Ensure you're using the correct Slack user ID format (U1234567890)

### Testing Mentions

1. Use the "Send Team Message" feature in the admin panel
2. Start with your own Slack user ID to test
3. Verify the message appears in Slack with the @mention
4. Check that the mentioned user receives a notification

## Advanced Configuration

### Custom Team Roles

You can customize team mention groups in `src/lib/slack-mention-utils.ts`:

```typescript
export const TEAM_MENTIONS = {
  MANAGERS: ['U123456', 'U789012'],
  SALES_TEAM: ['U345678', 'U901234'],
  ENGINEERING: ['U567890', 'U123456'],
  // Add your own team structures
} as const;
```

### Integration with Existing Notifications

All existing Slack notification methods now support optional mentions:

```typescript
// Send approval notification with mentions
await slackService.sendApprovalNotification(
  sowId, sowTitle, clientName, stageName, approverName, 
  'approved', comments, ['U123456', 'U789012']
);

// Send status change with mentions
await slackService.sendStatusChangeNotification(
  sowId, sowTitle, clientName, oldStatus, newStatus, 
  changedBy, ['U123456']
);
```
