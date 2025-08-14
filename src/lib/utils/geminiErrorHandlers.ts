import { TranscriptionAnalysisResponse } from '@/lib/gemini';

/**
 * Clean and parse JSON content from AI response
 */
export function cleanAndParseJSON(content: string): unknown {
  // Clean the content - remove any markdown formatting or extra text
  let cleanedContent = content.trim();
  
  // Remove markdown code blocks if present
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Try to extract JSON if there's extra text
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedContent = jsonMatch[0];
  }
  
  // Additional cleaning for markdown content
  cleanedContent = cleanedContent
    .replace(/^---.*$/gm, '') // Remove markdown separators
    .replace(/^###\s*\*\*.*?\*\*:?\s*/gm, '') // Remove markdown headers with bold
    .replace(/^#+\s*\*\*.*?\*\*:?\s*/gm, '') // Remove any markdown headers with bold
    .replace(/^#+\s*.*?:?\s*/gm, '') // Remove other markdown headers
    .replace(/^\*\*.*?\*\*:?\s*/gm, '') // Remove bold text labels
    .replace(/^[-*]\s*/gm, '') // Remove list markers
    .trim();
  
  // Try to find JSON again after cleaning
  const finalJsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
  if (finalJsonMatch) {
    cleanedContent = finalJsonMatch[0];
  }
  
  return JSON.parse(cleanedContent);
}

/**
 * Validate parsed response has required fields
 */
export function validateParsedResponse(parsed: unknown): boolean {
  const typedParsed = parsed as { objectiveOverview?: unknown; painPoints?: unknown; solutions?: unknown };
  
  // More flexible validation - just need solutions object with some content
  return !!(
    typedParsed.solutions && 
    typeof typedParsed.solutions === 'object' && 
    Object.keys(typedParsed.solutions).length > 0
  );
}

/**
 * Create standardized response from parsed data
 */
export function createStandardResponse(parsed: unknown, isFallback: boolean = false): TranscriptionAnalysisResponse {
  const typedParsed = parsed as {
    objectiveOverview?: string;
    painPoints?: unknown[];
    solutions?: Record<string, unknown[]>;
  };
  
  // Smart field mapping - dynamically map any field names to a flexible structure
  const mapFieldNames = (solutions: Record<string, unknown[]> | undefined) => {
    // Start with empty arrays for any fields that might exist
    const mapped: Record<string, string[]> = {};

    if (!solutions) return mapped;

    // Map any field names dynamically - preserve the original field names
    Object.entries(solutions).forEach(([fieldName, value]) => {
      const arrayValue = Array.isArray(value) ? value as string[] : [];
      // Use the original field name from the AI response
      mapped[fieldName] = arrayValue;
    });

    return mapped;
  };

  const mappedSolutions = mapFieldNames(typedParsed.solutions);
  
  // Debug logging to see what was mapped
  console.log('🔍 Field Mapping Debug:');
  console.log('Original solutions:', typedParsed.solutions);
  console.log('Mapped solutions:', mappedSolutions);
  
  return {
    objectiveOverview: typedParsed.objectiveOverview || 'Objective could not be generated',
    painPoints: Array.isArray(typedParsed.painPoints) ? typedParsed.painPoints as string[] : ['Pain points could not be generated'],
    solutions: mappedSolutions, // Return the solutions exactly as the AI provided them
    isFallback
  };
}

/**
 * Extract content from markdown/text response when JSON parsing fails
 */
export function extractContentFromText(content: string): { objective: string; scopeItems: string[] } {
  // Clean markdown content for text extraction
  const cleanedContent = content
    .replace(/^---.*$/gm, '') // Remove markdown separators
    .trim();
  
  const lines: string[] = cleanedContent.split('\n').filter((line: string) => line.trim().length > 0);
  
  // Look for objective section
  let objectiveSection = '';
  let scopeSection = '';
  let currentSection = '';
  
  for (const line of lines) {
    if (line.match(/^#+\s*\*\*.*OBJECTIVE.*\*\*/i) || line.match(/^#+\s*OBJECTIVE/i)) {
      currentSection = 'objective';
      continue;
    } else if (line.match(/^#+\s*\*\*.*SCOPE.*\*\*/i) || line.match(/^#+\s*SCOPE/i)) {
      currentSection = 'scope';
      continue;
    }
    
    if (currentSection === 'objective' && !line.match(/^#+\s*/)) {
      objectiveSection += line + '\n';
    } else if (currentSection === 'scope' && !line.match(/^#+\s*/)) {
      scopeSection += line + '\n';
    }
  }
  
  // Use parsed sections if available, otherwise fall back to line-by-line search
  let objective: string = '';
  if (objectiveSection.trim()) {
    objective = objectiveSection.trim();
  } else {
    // Look for objective in various formats
    const objectiveLine = lines.find((line: string) => 
      line.toLowerCase().includes('objective') || 
      line.toLowerCase().includes('goal') ||
      line.toLowerCase().includes('aim') ||
      line.toLowerCase().includes('purpose')
    );
    
    // If no objective found, try to extract from the first meaningful paragraph
    if (objectiveLine) {
      objective = objectiveLine;
    } else {
      objective = lines.find((line: string) => 
        line.length > 20 && 
        !line.startsWith('-') && 
        !line.startsWith('•') && 
        !line.startsWith('*') &&
        !/^\d+\./.test(line.trim())
      ) || 'Project objective could not be generated due to formatting issues';
    }
  }
  
  // Extract scope items from parsed section or various list formats
  let scopeItems: string[] = [];
  if (scopeSection.trim()) {
    // Parse scope section for list items
    const scopeLines = scopeSection.split('\n').filter(line => line.trim().length > 0);
    scopeItems = scopeLines
      .filter((line: string) => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('•') || 
        line.trim().startsWith('*') ||
        /^\d+\./.test(line.trim()) ||
        line.trim().startsWith('1.') ||
        line.trim().startsWith('2.') ||
        line.trim().startsWith('3.') ||
        line.trim().startsWith('4.') ||
        line.trim().startsWith('5.')
      )
      .map((line: string) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter((item: string) => item.length > 0);
  }
  
  // If no scope items found in parsed section, fall back to line-by-line search
  if (scopeItems.length === 0) {
    scopeItems = lines
      .filter((line: string) => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('•') || 
        line.trim().startsWith('*') ||
        /^\d+\./.test(line.trim()) ||
        line.trim().startsWith('1.') ||
        line.trim().startsWith('2.') ||
        line.trim().startsWith('3.') ||
        line.trim().startsWith('4.') ||
        line.trim().startsWith('5.')
      )
      .map((line: string) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter((item: string) => item.length > 0);
  }
  
  return {
    objective: objective.replace(/^.*?:\s*/, '').trim(),
    scopeItems
  };
}

/**
 * Create fallback response when all parsing attempts fail
 */
export function createFallbackResponse(scopeItems: string[]): TranscriptionAnalysisResponse {
  return {
    objectiveOverview: scopeItems.length > 0 ? scopeItems[0] : 'Project objective could not be generated due to formatting issues',
    painPoints: scopeItems.length > 0 ? scopeItems.slice(0, 3) : ['Manual lead routing and assignment processes', 'Duplicate leads and contacts in Salesforce', 'Inconsistent data quality across objects'],
    solutions: {
      "General Solutions": scopeItems.length > 3 ? scopeItems.slice(3, 5) : ['Automate lead routing based on territory and account status', 'Implement lead-to-account matching logic']
    },
    isFallback: true
  };
}

/**
 * Get user-friendly error message from error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      return 'Project objective could not be generated: API key not configured';
    } else if (error.message.includes('quota')) {
      return 'Project objective could not be generated: API quota exceeded';
    } else if (error.message.includes('rate limit')) {
      return 'Project objective could not be generated: Rate limit exceeded';
    } else if (error.message.includes('network')) {
      return 'Project objective could not be generated: Network error';
    } else {
      return `Project objective could not be generated: ${error.message}`;
    }
  }
  return 'Project objective could not be generated due to an error';
}

/**
 * Create error response with fallback content
 */
export function createErrorResponse(error: unknown): TranscriptionAnalysisResponse {
  return {
    objectiveOverview: getErrorMessage(error),
    painPoints: ['Manual lead routing and assignment processes', 'Duplicate leads and contacts in Salesforce', 'Inconsistent data quality across objects'],
    solutions: {
      "General Solutions": ['Automate lead routing based on territory and account status', 'Implement lead-to-account matching logic']
    },
    isFallback: true
  };
}
