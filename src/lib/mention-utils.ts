/**
 * Utility functions for detecting and parsing @mentions in SOW comments
 */

export interface MentionedUser {
  username: string;
  email?: string;
  slackUserId?: string;
  fullName?: string;
}

/**
 * Extract @mentions from comment text
 * Supports formats: @username, @user.name, @user-name
 */
export function extractMentions(commentText: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(commentText)) !== null) {
    const username = match[1];
    if (username && !mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * Parse a comment and return all mentioned users
 */
export function parseCommentMentions(commentText: string): MentionedUser[] {
  const usernames = extractMentions(commentText);
  
  return usernames.map(username => ({
    username,
    // These will be populated when we look up user details
    email: undefined,
    slackUserId: undefined,
    fullName: undefined
  }));
}

/**
 * Check if a comment contains any @mentions
 */
export function hasMentions(commentText: string): boolean {
  return extractMentions(commentText).length > 0;
}

/**
 * Format comment text to highlight mentions
 * Converts @username to clickable links or styled text
 */
export function formatCommentWithMentions(commentText: string): string {
  return commentText.replace(
    /@([a-zA-Z0-9._-]+)/g,
    '<span class="mention bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium">@$1</span>'
  );
}

/**
 * Clean comment text by removing @ symbols for storage
 * This is useful if you want to store the clean text separately
 */
export function cleanCommentText(commentText: string): string {
  return commentText.replace(/@([a-zA-Z0-9._-]+)/g, '$1');
}

/**
 * Example usage:
 * 
 * const comment = "@john.doe @sarah.smith Can you review this SOW?";
 * const mentions = parseCommentMentions(comment);
 * // Returns: [
 * //   { username: 'john.doe' },
 * //   { username: 'sarah.smith' }
 * // ]
 * 
 * const hasMentions = hasMentions(comment); // true
 * const formatted = formatCommentWithMentions(comment);
 * // Returns HTML with styled mention spans
 */
