/**
 * Centralized URL utility for determining the correct base URL
 * Handles both development and production environments
 */

/**
 * Get the correct base URL for the application
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL (for client-side and server-side)
 * 2. NEXTAUTH_URL (fallback for server-side)
 * 3. VERCEL_URL (automatically set by Vercel)
 * 4. localhost fallback for development
 */
export function getAppBaseUrl(): string {
  // Check NEXT_PUBLIC_APP_URL first (most reliable)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check NEXTAUTH_URL as fallback
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Check VERCEL_URL (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Development fallback
  return 'http://localhost:3000';
}

/**
 * Construct a full URL for a SOW
 */
export function getSOWUrl(sowId: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/sow/${sowId}`;
}

/**
 * Construct a full URL for PM hours removal request
 */
export function getPMHoursRemovalUrl(requestId: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/pmo/pm-hours-removal?id=${requestId}`;
}

/**
 * Log the current URL configuration for debugging
 */
export function logUrlConfiguration(): void {
  const baseUrl = getAppBaseUrl();
  console.log('🔗 App URL Configuration:');
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'not set'}`);
  console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);
  console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
}
