/**
 * Utility functions for handling Gemini AI response errors
 */

/**
 * Create a simple error response when AI analysis fails
 */
export function createErrorResponse(error: unknown, customerName: string): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  throw new Error(`AI analysis failed for ${customerName}: ${errorMessage}`);
}

/**
 * Create a fallback response when AI analysis fails (for backward compatibility)
 * Note: This is deprecated - functions should throw errors instead
 */
export function createFallbackResponse(customerName: string, scopeItems: string[]): never {
  console.warn('createFallbackResponse is deprecated - functions should throw errors instead');
  throw new Error(`AI analysis failed for ${customerName}: Fallback responses are no longer supported`);
}
