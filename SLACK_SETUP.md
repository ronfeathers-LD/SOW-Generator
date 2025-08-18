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

# NEW: Bot Token for @Mentions
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_WORKSPACE_DOMAIN=company.slack.com
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

### 3. Create a Webhook

1. Click &quot;Add New Webhook to Workspace&quot; and choose the channel where you want to receive notifications.
2. Click &quot;Allow&quot;
3. Copy the webhook URL

### 4. Configure Bot Token for @Mentions

1. In your Slack app settings, go to &quot;OAuth & Permissions&quot;
2. Add the following bot token scopes:
   - `users:read` - To lookup user information
   - `users:read.email` - To lookup users by email
   - `team:read` - To read workspace information
3. Install the app to your workspace
4. Copy the &quot;Bot User OAuth Token&quot; (starts with `xoxb-`)
5. Add it to your environment variables as `SLACK_BOT_TOKEN`

### 5. Configure the App

1. Go to your SOW Generator admin panel
2. Navigate to Admin → Slack
3. Paste your webhook URL
4. Add your bot token for @mention functionality
5. Configure the default channel, username, and icon emoji
6. Save the configuration
7. Test the connection and user lookup

## What Gets Notified

The Slack integration will send notifications for:

- **SOW Creation**: When a new SOW is created
- **Approval Actions**: When SOWs are approved, rejected, or skipped
- **Status Changes**: When SOW status changes
- **Approval Requests**: When someone needs to approve a SOW
- **NEW: @Mentions in Comments**: When users are @mentioned in SOW comments

## New: @Mention Functionality

### How It Works

1. **Users type @username** in SOW comments (e.g., `@john.doe Can you review this?`)
2. **System automatically looks up** the user in your Slack workspace
3. **Slack notification is sent** with @mentions to notify the users
4. **Mentioned users get notified** instantly in Slack

### NEW: Autocomplete Functionality

The system now includes **intelligent autocomplete** for @mentions:

- **Type @ to see suggestions** - Start typing `@` to see a dropdown of team members
- **Keyboard navigation** - Use arrow keys to navigate through suggestions
- **Smart filtering** - Suggestions filter as you type
- **User avatars** - See user initials and profile information
- **Multiple search fields** - Search by username, display name, or email

### Benefits

- **No manual configuration** - Users just type @username
- **Automatic user lookup** - System finds the right Slack user ID
- **Instant notifications** - Team members get notified immediately
- **Better collaboration** - No more missed comments or delayed responses
- **Enhanced UX** - Intuitive autocomplete makes mentioning easy

### Supported Formats

- `@username` - e.g., `@john.doe`
- `@user.name` - e.g., `@john.doe`
- `@user-name` - e.g., `@john-doe`
- Full email addresses also work

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

1. **Go to your SOW Generator admin panel**
2. **Navigate to Admin → Slack**
3. **Use the "Test @Mention User Lookup" section**
4. **Enter a username or email** (e.g., `ronfeathers` or `ron.feathers@company.com`)
5. **Click "Test Lookup"** to verify the system can find the user
6. **Check the results** - you should see the user's Slack information

**API Endpoint:** `/api/slack/lookup?username={username}`

**Note:** This endpoint requires admin authentication and will return user details from your Slack workspace.

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
