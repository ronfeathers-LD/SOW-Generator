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

## Notification Format

Notifications include:
- SOW title and client name
- Action taken (approve/reject/skip)
- Approver name
- Comments (if provided)
- Timestamps
- Direct links to review SOWs

## Troubleshooting

### Common Issues

1. **Webhook URL Invalid**: Make sure the webhook URL is correct and starts with `https://hooks.slack.com/services/`
2. **Channel Not Found**: Ensure the channel exists in your workspace
3. **Permission Denied**: Make sure the webhook has access to the specified channel
4. **Rate Limiting**: Slack has rate limits; if you're sending many notifications, they might be throttled

### Testing

Use the "Test Connection" button in the admin panel to verify your setup. This will send a test message to your configured channel.

### Logs

Check your application logs for any Slack-related errors. Failed notifications won't break the main application flow but will be logged for debugging.
