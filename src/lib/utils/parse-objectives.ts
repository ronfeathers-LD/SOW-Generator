/**
 * Utility function to parse objectives that might be stored as HTML, JSON, or plain text
 * This ensures consistent parsing behavior across the application
 */
export function parseObjectives(field: unknown): string[] {
  if (!field) return [];
  
  if (Array.isArray(field)) {
    return field;
  }
  
  if (typeof field === 'string') {
    // Check if it's HTML content
    if (field.includes('<ul>') || field.includes('<li>')) {
      // Extract text content from HTML
      const textContent = field
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '')
        .replace(/<li>/g, '')
        .replace(/<\/li>/g, '\n')
        .trim();
      
      // Split by newlines and filter out empty lines
      return textContent.split('\n').filter(line => line.trim().length > 0);
    }
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If not JSON, treat as plain text
      return field.split('\n').filter(line => line.trim().length > 0);
    }
  }
  
  return [];
}
