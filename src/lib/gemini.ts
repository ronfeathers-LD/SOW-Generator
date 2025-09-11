import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
  customerName: string;
  objectiveOverview: string;
  overcomingActions: string[];
  solutions: Record<string, string[]>;
  isFallback: boolean;
  error?: string;
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
    console.log(`Model switched to ${newModelName}`);
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
    existingObjectives?: string[],
    supportingDocuments?: string
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
        
        const result = await this.analyzeTranscription(transcript, customerName, selectedProducts, existingDescription, existingObjectives, supportingDocuments);
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
    existingObjectives?: string[],
    supportingDocuments?: string
  ): Promise<TranscriptionAnalysisResponse> {
    // Fetch the AI prompt from the database
    const supabase = await createServerSupabaseClient();
    
    const { data: aiPrompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_content, name, id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1);

    if (promptError) {
      console.error('Failed to fetch AI prompts from database:', promptError);
      throw new Error('Failed to fetch AI prompts from database. Please check the prompt configuration.');
    }

    if (!aiPrompts || aiPrompts.length === 0) {
      console.error('No active AI prompts found in database');
      throw new Error('No active AI prompts found in database. Please create an active AI prompt in the admin panel.');
    }

    const aiPrompt = aiPrompts[0];
    if (!aiPrompt?.prompt_content) {
      console.error('AI prompt found but has no content:', aiPrompt);
      throw new Error('AI prompt found but has no content. Please check the prompt configuration.');
    }
    
    // Database prompt loaded successfully

    // Build the complete prompt by combining:
    // 1. Fixed JSON structure requirements (code-based, non-editable)
    // 2. Editable content analysis guidance (from database)
    // 3. Dynamic data (transcript, customer info, etc.)
    
    // Build the solutions object - products are now pre-sorted by the API route
    let solutionsTemplate;
    
    if (selectedProducts && selectedProducts.length > 0) {
      // Products are already sorted by database sort_order from the API route
      solutionsTemplate = selectedProducts.map(product => `    "${product}": [
      "Specific solution item related to ${product}, as discussed in the transcript."
    ]`).join(',\n');
    } else {
      solutionsTemplate = `    "productName1": [
      "Specific solution item related to productName1, as discussed in the transcript."
    ]`;
    }
    
    const jsonStructure = `
IMPORTANT: You must respond with valid JSON in exactly this format:
{
  "customerName": "${customerName}",
  "objectiveOverview": "A comprehensive paragraph summarizing the customer's primary goals and the overall purpose of the project. This paragraph must explicitly mention the company name from the customerName variable and the LeanData products being implemented.",
  "overcomingActions": [
    "An objective or action we will take to overcome a pain point.",
    "Another objective or action.",
    "A third objective or action."
  ],
  "solutions": {
${solutionsTemplate}
  },
  "isFallback": false
}

CRITICAL: 
The solutions object must maintain the EXACT order of products as shown above. Do not reorder, rename, or change the existing product names. Additionally, you must analyze the transcript for any other solutions, features, or related requirements discussed, and create new keys for each of these items within the solutions object (e.g., 'Reporting').

Input Variables Available:
- customerName: "${customerName}"
- transcription: [Full meeting transcript provided]
- selectedProducts: "${selectedProducts ? selectedProducts.join(', ') : 'None specified'}"
- existingDescription: "${existingDescription || 'None provided'}"
- existingObjectives: "${existingObjectives ? JSON.stringify(existingObjectives) : 'None provided'}"
- supportingDocuments: "${supportingDocuments || 'None provided'}"

The response must be valid JSON. Do not include any text before or after the JSON.`;

    // The database prompt now contains only content analysis guidance (no placeholders)
    // We use it as-is since the fixed structure already includes all the dynamic data
    const contentGuidance = aiPrompt.prompt_content;

    // Combine fixed structure with editable guidance and include the actual transcript
    const finalPrompt = `${jsonStructure}

${contentGuidance}

ACTUAL TRANSCRIPT TO ANALYZE:
${transcript}`;



    return this.executePrompt(finalPrompt, transcript, customerName);
  }

  /**
   * Execute a prompt and parse the response
   */
  private async executePrompt(
    prompt: string,
    transcript: string,
    customerName: string
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
          return { customerName: customerName, objectiveOverview: 'Objective could not be extracted', overcomingActions: [], solutions: {}, isFallback: true };
        }

        // If neither JSON nor HTML, throw error
        throw new Error('Response does not appear to contain valid JSON or HTML');
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      
      // Enhanced error logging with more context
      console.error('Gemini API call failed:', {
        error: error.message,
        stack: error.stack,
        model: this.modelName,
        customerName,
        transcriptLength: transcript.length,
        timestamp: new Date().toISOString()
      });
      
      // Check for specific error types and provide more descriptive messages
      if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        throw new Error('Model is currently overloaded. Please try again later.');
      }
      
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('Invalid API key')) {
        throw new Error('API key is invalid or expired. Please check your configuration.');
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
      
      if (error.message.includes('timeout') || error.message.includes('deadline')) {
        throw new Error('Request timed out. Please try again.');
      }
      
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
  existingObjectives?: string[],
  supportingDocuments?: string
): Promise<TranscriptionAnalysisResponse> {
  // Get API key from database using server-side client
  const { createServerSupabaseClient } = await import('@/lib/supabase-server');
  
  const supabase = await createServerSupabaseClient();
  
  // Get all active configurations and select the most recent one
  const { data: configs, error } = await supabase
    .from('gemini_configs')
    .select('api_key, model_name, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching Gemini configs:', error);
    throw new Error('Failed to fetch Gemini configuration. Please check the admin panel.');
  }

  if (!configs || configs.length === 0) {
    throw new Error('No active Gemini configuration found. Please configure it in the admin panel.');
  }

  const config = configs[0]; // Use the most recent active configuration

  if (!config?.api_key) {
    throw new Error('Gemini API key not configured. Please configure it in the admin panel.');
  }

  
      // API key validation completed
  
  // Check if API key looks like it's been masked
  if (config.api_key.includes('•') || config.api_key.includes('····')) {
    throw new Error('API key appears to be masked. Please enter the actual API key, not the masked version.');
  }

  // Use the primary API key with the saved model
  const client = new GeminiClient(config.api_key, config.model_name || 'gemini-2.5-flash');
  return await client.analyzeTranscriptionWithFallback(transcript, customerName, selectedProducts, existingDescription, existingObjectives, supportingDocuments);
} 