/**
 * Utility functions for Slack mentions and team notifications
 */

/**
 * Common Slack mention patterns for team roles
 */
export const TEAM_MENTIONS = {
  // Add your team's Slack user IDs here
  // Example:
  // MANAGERS: ['U123456', 'U789012'],
  // SALES_TEAM: ['U345678', 'U901234'],
  // ENGINEERING: ['U567890', 'U123456'],
  
  // You can customize these based on your team structure
  ALL_TEAM: [] as string[],
  MANAGERS: [] as string[],
  SALES_TEAM: [] as string[],
  ENGINEERING: [] as string[],
  SUPPORT_TEAM: [] as string[],
} as const;

/**
 * Helper function to get mentions for a specific team role
 */
export function getTeamMentions(role: keyof typeof TEAM_MENTIONS): string[] {
  return TEAM_MENTIONS[role] || [];
}

/**
 * Helper function to combine multiple mention arrays
 */
export function combineMentions(...mentionArrays: string[][]): string[] {
  const allMentions = mentionArrays.flat();
  // Remove duplicates while preserving order
  return Array.from(new Set(allMentions));
}

/**
 * Helper function to format a message with mentions
 */
export function formatMessageWithMentions(message: string, mentions: string[]): string {
  if (mentions.length === 0) return message;
  
  const mentionText = mentions.map(userId => `<@${userId}>`).join(' ');
  return `${mentionText} ${message}`;
}

/**
 * Common team message templates
 */
export const TEAM_MESSAGE_TEMPLATES = {
  DAILY_STANDUP: (date: string) => `Daily standup starting now for ${date}! Please join the meeting.`,
  
  WEEKLY_REVIEW: (week: string) => `Weekly review meeting for ${week} starting in 5 minutes.`,
  
  URGENT_ALERT: (issue: string) => `🚨 URGENT: ${issue} - Immediate attention required!`,
  
  SUCCESS_CELEBRATION: (achievement: string) => `🎉 Great news! ${achievement}`,
  
  REMINDER: (task: string, deadline?: string) => 
    `⏰ Reminder: ${task}${deadline ? ` (Due: ${deadline})` : ''}`,
  
  ANNOUNCEMENT: (title: string, content: string) => 
    `📢 ${title}\n\n${content}`,
  
  MEETING_INVITE: (meeting: string, time: string, link?: string) => 
    `📅 Meeting: ${meeting}\n⏰ Time: ${time}${link ? `\n🔗 Link: ${link}` : ''}`,
} as const;

/**
 * Example usage:
 * 
 * // Send a daily standup reminder to managers
 * const slackService = getSlackService();
 * if (slackService) {
 *   const mentions = getTeamMentions('MANAGERS');
 *   await slackService.sendTeamMessage(
 *     TEAM_MESSAGE_TEMPLATES.DAILY_STANDUP('Monday'),
 *     mentions,
 *     undefined,
 *     'Daily Standup Reminder'
 *   );
 * }
 * 
 * // Send urgent alert to entire team
 * const allMentions = getTeamMentions('ALL_TEAM');
 * await slackService.sendTeamMessage(
 *   TEAM_MESSAGE_TEMPLATES.URGENT_ALERT('Database connection issue'),
 *   allMentions,
 *   '#alerts',
 *   'System Alert'
 * );
 */
