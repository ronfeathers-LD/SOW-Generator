import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiBulletPoint {
  title: string;
  description: string;
  category: 'deliverable' | 'requirement' | 'assumption' | 'timeline';
}

interface GeminiGenerationResponse {
  bulletPoints: GeminiBulletPoint[];
  summary: string;
}



interface TranscriptionAnalysisResponse {
  html?: string; // HTML content from AI
  objectiveOverview?: string;
  painPoints?: string[];
  solutions?: Record<string, string[]>;
  isFallback?: boolean;
  error?: string;
  rawContent?: string;
  [key: string]: any; // Keep flexible for backward compatibility
}

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Switch to a different model (useful when one model is overloaded)
   */
  switchModel(newModelName: string) {
    this.modelName = newModelName;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
          // Model switched
  }

  /**
   * Get available models for fallback
   */
  static getAvailableModels(): string[] {
    return [
      'gemini-2.5-flash',    // Latest and fastest model
      'gemini-1.5-flash',    // Fast, commonly overloaded
      'gemini-1.5-pro',      // More capable, sometimes less load
      'gemini-1.0-pro',      // Older model, often less load
      'gemini-pro'           // Legacy model, usually available
    ];
  }

  /**
   * Generate SOW bullet points from call transcript
   */
  async generateSOWBulletPoints(
    transcript: string,
    customerName: string,
    projectContext?: string
  ): Promise<GeminiGenerationResponse> {
    const startTime = Date.now();
    const prompt = `
You are an expert at analyzing sales calls and extracting key information for Statement of Work (SOW) documents.

Please analyze the following call transcript between LeanData and ${customerName} and extract deliverables in a structured format.

${projectContext ? `Project Context: ${projectContext}` : ''}

Call Transcript:
${transcript}

Please provide your response in the following JSON format, organizing deliverables by category:
{
  "bulletPoints": [
    {
      "title": "LEADS",
      "description": "Deduplication of Leads against existing Leads and Contacts.\nRoute Leads to Matched Accounts.\nUse GR nodes to determine if there are open cases. If there is an open case, send notification to case owner and lead owner.\nRoute leads via GEO and Revenue to Round Robins and individuals if no account match\nSend Teams notifications on lead to account match and lead assignment",
      "category": "deliverable"
    },
    {
      "title": "CONTACTS", 
      "description": "Mimics Lead Routing\nIf contact matches open opportunities, assign contact role.",
      "category": "deliverable"
    },
    {
      "title": "INTEGRATIONS",
      "description": "Teams\nGong",
      "category": "deliverable"
    }
  ],
  "summary": "Brief summary of the key points discussed"
}

IMPORTANT: For deliverables, organize them into categories like LEADS, CONTACTS, INTEGRATIONS, etc. Each category should be a separate bullet point with the category name as the title and the specific items as the description (separated by newlines).

Focus on organizing deliverables into logical categories like LEADS, CONTACTS, INTEGRATIONS, etc. Each category should contain specific, actionable items that would be included in a professional SOW document. Be specific and avoid generic statements.
`;

    let geminiResponse = '';
    let parsedResult: Record<string, unknown> | undefined;
    let error: Error | undefined;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      geminiResponse = content || '';

      if (!content) {
        throw new Error('No content received from Gemini');
      }

      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(content);
        parsedResult = parsed;
        return {
          bulletPoints: parsed.bulletPoints || [],
          summary: parsed.summary || 'No summary available'
        };
      } catch {
        // If JSON parsing fails, create a fallback response
        const fallbackResult = {
          bulletPoints: [
            {
              title: 'Transcript Analysis',
              description: content,
              category: 'deliverable' as const
            }
          ],
          summary: 'Analysis completed but response format was unexpected'
        };
        parsedResult = fallbackResult;
        return fallbackResult;
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      console.error('Error generating bullet points:', error);
      throw error;
    } finally {
      // Log the Gemini API call
      try {
        const { GeminiLoggingService } = await import('./gemini-logging');
        const processingTime = Date.now() - startTime;
        
        await GeminiLoggingService.logGeminiCall(
          '/api/avoma/search',
          'POST',
          customerName,
          transcript,
          prompt,
          geminiResponse,
          parsedResult,
          error,
          this.modelName,
          'API_KEY_PLACEHOLDER',
          processingTime
        );
      } catch (loggingError) {
        console.error('Failed to log Gemini call:', loggingError);
      }
    }
  }

  /**
   * Generate a project description from call transcript
   */
  async generateProjectDescription(
    transcript: string,
    customerName: string
  ): Promise<string> {
    const startTime = Date.now();
    const prompt = `
Based on the following call transcript between LeanData and ${customerName}, write a concise project description suitable for a Statement of Work document.

Call Transcript:
${transcript}

Please provide a professional, 2-3 sentence project description that captures the main objectives and scope discussed in the call.
`;

    let geminiResponse = '';
    let error: Error | undefined;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      geminiResponse = content || '';
      
      if (!content) {
        throw new Error('No content received from Gemini');
      }
      
      return content;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      console.error('Error generating project description:', error);
      return 'Project description could not be generated due to an error';
    } finally {
      // Log the Gemini API call
      try {
        const { GeminiLoggingService } = await import('./gemini-logging');
        const processingTime = Date.now() - startTime;
        
        await GeminiLoggingService.logGeminiCall(
          '/api/avoma/search',
          'POST',
          customerName,
          transcript,
          prompt,
          geminiResponse,
          undefined, // No parsed result for this endpoint
          error,
          this.modelName,
          'API_KEY_PLACEHOLDER',
          processingTime
        );
      } catch (loggingError) {
        console.error('Failed to log Gemini call:', loggingError);
      }
    }
  }

  /**
   * Analyze transcription with model fallback - tries different models if one is overloaded
   */
  async analyzeTranscriptionWithFallback(
    transcript: string,
    customerName: string,
    selectedProducts?: string[],
    existingDescription?: string,
    existingObjectives?: string[]
  ): Promise<TranscriptionAnalysisResponse> {
    const models = GeminiClient.getAvailableModels();
    let lastError: Error | null = null;

    // Start with the current model (saved in database), then try others if needed
    const orderedModels = [
      this.modelName, // Start with the saved model
      ...models.filter(m => m !== this.modelName) // Then try other models
    ];

    for (const modelName of orderedModels) {
      try {
        // Trying model
        this.switchModel(modelName);
        
        const result = await this.analyzeTranscription(transcript, customerName, selectedProducts, existingDescription, existingObjectives);
                  // Success with model
        return result;
        
      } catch (error) {
        // Model failed, trying next
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If it's not an overload error, don't try other models
        if (error instanceof Error && 
            !error.message.includes('503 Service Unavailable') && 
            !error.message.includes('model is overloaded') &&
            !error.message.includes('Please try again later')) {
          throw error;
        }
        
        // Continue to next model for overload errors
        continue;
      }
    }
    
    // All models failed
    throw lastError || new Error('All Gemini models are currently overloaded');
  }

  /**
   * Analyze transcription and generate objective and scope
   */
  async analyzeTranscription(
    transcript: string,
    customerName: string,
    selectedProducts?: string[],
    existingDescription?: string,
    existingObjectives?: string[]
  ): Promise<TranscriptionAnalysisResponse> {
    // Fetch the AI prompt from the database
    const { supabase } = await import('@/lib/supabase');
    
    const { data: aiPrompt, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_content')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (promptError || !aiPrompt?.prompt_content) {
      console.error('Failed to fetch AI prompt from database:', promptError);
      throw new Error('Failed to fetch AI prompt from database. Please check the prompt configuration.');
    }
    
    // Check if the database prompt has the required placeholders
    const hasRequiredPlaceholders = aiPrompt.prompt_content.includes('{customerName}') && 
                                 aiPrompt.prompt_content.includes('{transcription}') && 
                                 aiPrompt.prompt_content.includes('{selectedProducts}');
    
    if (!hasRequiredPlaceholders) {
      console.error('Database prompt missing required placeholders. Please update the prompt template.');
      throw new Error('Database prompt is missing required placeholders. Please update the prompt template to include {customerName}, {transcription}, and {selectedProducts}.');
    }
    
    // Use the prompt from the database, replacing placeholders
    const finalPrompt = aiPrompt.prompt_content
      .replace(/\{customerName\}/g, customerName)
      .replace(/\{transcription\}/g, transcript)
      .replace(/\{selectedProducts\}/g, selectedProducts ? selectedProducts.join(', ') : '')
      .replace(/\{existingDescription\}/g, existingDescription || '')
      .replace(/\{existingObjectives\}/g, existingObjectives ? JSON.stringify(existingObjectives) : '[]');

    return this.executePrompt(finalPrompt, transcript, customerName, selectedProducts, existingDescription, existingObjectives);
  }

  /**
   * Execute a prompt and parse the response
   */
  private async executePrompt(
    prompt: string,
    transcript: string,
    customerName: string,
    selectedProducts?: string[],
    existingDescription?: string,
    existingObjectives?: string[]
  ): Promise<TranscriptionAnalysisResponse> {
    const startTime = Date.now();
    let geminiResponse = '';
    let error: Error | undefined;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      geminiResponse = content || '';

      if (!content) {
        throw new Error('No content received from Gemini');
      }

      // Enhanced response handling - support both JSON with HTML content and pure HTML
      try {
        // Clean the response - remove any extra text or markdown
        let cleanedContent = geminiResponse.trim();
        
        // Remove markdown code blocks if present
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```html')) {
          cleanedContent = cleanedContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to extract JSON if there's extra text
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedContent = jsonMatch[0];
        }
        
        // Try to parse as JSON first (our preferred format)
        if (cleanedContent.startsWith('{') && cleanedContent.includes('}')) {
          try {
            const parsed = JSON.parse(cleanedContent);
            console.log('AI response parsed successfully');
            return parsed as TranscriptionAnalysisResponse;
          } catch {
            console.log('JSON parsing failed, trying HTML processing');
            // Fall through to HTML processing
          }
        }

        // If JSON parsing failed or content doesn't look like JSON, try HTML processing
        if (cleanedContent.startsWith('<') || cleanedContent.includes('>')) {
          console.log('Processing as HTML content');
          return { html: cleanedContent, isFallback: false };
        }

        // If neither JSON nor HTML, throw error
        throw new Error('Response does not appear to contain valid JSON or HTML');
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      console.error('Gemini API call failed:', error);
      throw error;
    } finally {
      // Log the Gemini API call
      try {
        const { GeminiLoggingService } = await import('./gemini-logging');
        const processingTime = Date.now() - startTime;
        
        await GeminiLoggingService.logGeminiCall(
          '/api/gemini/analyze-transcription',
          'POST',
          customerName,
          transcript,
          prompt,
          geminiResponse,
          undefined, // No parsed result for this endpoint
          error,
          this.modelName,
          'API_KEY_PLACEHOLDER',
          processingTime
        );
      } catch (loggingError) {
        console.error('Failed to log Gemini call:', loggingError);
      }
    }
  }

  /**
   * Extract fallback content when JSON parsing fails
   */
  private extractFallbackContent(content: string): { objective: string; scopeItems: string[] } {
    console.log('=== EXTRACTING FALLBACK CONTENT ===');
    
    // Try to find any structured content
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const scopeItems: string[] = [];
    let objective = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        scopeItems.push(trimmed.substring(1).trim());
      } else if (trimmed.length > 50 && !objective) {
        objective = trimmed;
      }
    }
    
    console.log('Extracted objective:', objective);
    console.log('Extracted scope items:', scopeItems);
    
    return {
      objective: objective || 'Project objective could not be extracted',
      scopeItems: scopeItems.length > 0 ? scopeItems : ['Manual lead routing and assignment processes']
    };
  }
}

export { GeminiClient, type GeminiBulletPoint, type GeminiGenerationResponse, type TranscriptionAnalysisResponse };

// Helper function to analyze transcription
export async function analyzeTranscription(
  transcript: string, 
  customerName: string,
  selectedProducts?: string[],
  existingDescription?: string,
  existingObjectives?: string[]
): Promise<TranscriptionAnalysisResponse> {
  // Get API key from database using server-side client
  const { createServerSupabaseClient } = await import('@/lib/supabase-server');
  
  const supabase = await createServerSupabaseClient();
  
  const { data: config, error } = await supabase
    .from('gemini_configs')
    .select('api_key, model_name, is_active')
    .eq('is_active', true)
    .single();

  if (error || !config?.api_key) {
    throw new Error('Gemini API key not configured. Please configure it in the admin panel.');
  }

  
      // API key validation completed
  
  // Check if API key looks like it's been masked
  if (config.api_key.includes('•') || config.api_key.includes('····')) {
    throw new Error('API key appears to be masked. Please enter the actual API key, not the masked version.');
  }

  // Use the primary API key with the saved model
  const client = new GeminiClient(config.api_key, config.model_name || 'gemini-2.5-flash');
  return await client.analyzeTranscriptionWithFallback(transcript, customerName, selectedProducts, existingDescription, existingObjectives);
} 