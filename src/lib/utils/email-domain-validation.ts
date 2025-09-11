/**
 * Email domain validation utilities
 * Ensures all messaging only goes to @leandata.com email addresses
 */

/**
 * Validates that an email address has a @leandata.com domain
 * @param email - The email address to validate
 * @returns true if the email is valid and has @leandata.com domain, false otherwise
 */
export function validateLeandataEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for @leandata.com domain
  const domain = email.toLowerCase().split('@')[1];
  return domain === 'leandata.com';
}

/**
 * Validates multiple email addresses and returns only valid @leandata.com addresses
 * @param emails - Array of email addresses to validate
 * @returns Array of valid @leandata.com email addresses
 */
export function filterValidLeandataEmails(emails: string[]): string[] {
  if (!Array.isArray(emails)) {
    return [];
  }

  return emails.filter(email => validateLeandataEmail(email));
}

/**
 * Validates a single email and throws an error if invalid
 * @param email - The email address to validate
 * @param context - Context for error message (e.g., "approver", "recipient")
 * @throws Error if email is not a valid @leandata.com address
 */
export function validateLeandataEmailOrThrow(email: string, context: string = 'recipient'): void {
  if (!validateLeandataEmail(email)) {
    throw new Error(`Invalid ${context} email address: ${email}. Only @leandata.com email addresses are allowed.`);
  }
}

/**
 * Logs a warning when an invalid email address is encountered
 * @param email - The invalid email address
 * @param context - Context for the warning message
 */
export function logInvalidEmailWarning(email: string, context: string): void {
  console.warn(`🚫 Blocked messaging to non-Leandata email: ${email} (${context}). Only @leandata.com addresses are allowed.`);
}
