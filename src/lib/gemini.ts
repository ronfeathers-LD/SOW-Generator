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
  [key: string]: any; // Completely flexible - accept anything the AI returns
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

    let finalPrompt: string;

        if (promptError || !aiPrompt?.prompt_content) {
      console.warn('Failed to fetch AI prompt from database, using fallback prompt');
      // Use fallback prompt logic
      const fallbackPrompt = `
LeanData Project Analysis Prompt

You are an expert business analyst and technical consultant specializing in LeanData solutions built upon Salesforce. Your task is to analyze a meeting transcript and extract key project details in a format suitable for a VP of Services.

Instructions

Analyze the provided meeting transcription and generate a valid, parseable JSON object that captures the project's core details.

The output must contain ONLY the JSON object. Do not include any introductory or explanatory text, markdown, or code blocks.

JSON Structure and Content Requirements

Your response must strictly adhere to the following JSON format.

{
  "objectiveOverview": "A comprehensive paragraph summarizing the customer's primary goals and the overall purpose of the project. The paragraph must explicitly mention the customer's name ({customerName}) and the LeanData products being implemented ({selectedProducts}).",
  "painPoints": [
    "An action-oriented pain point related to the project.",
    "Another action-oriented pain point.",
    "A third action-oriented pain point.",
    "A fourth action-oriented pain point."
  ],
  "solutions": {
    ${selectedProducts ? selectedProducts.map(product => `"${product}": ["Specific solution item related to ${product}, as discussed in the transcript."]`).join(',\n    ') : '// No products specified'}
  },
  "isFallback": false
}

Guidelines for Content Generation

Comprehensive Overview: If a value is provided in the existingDescription variable ({existingDescription}), use it as the starting point to generate a comprehensive paragraph for the objectiveOverview, otherwise, create a new summary based on the transcript. The overview should summarize the customer's primary goals and the overall purpose of the project and must explicitly mention the customer's name ({customerName}) and the LeanData products being implemented ({selectedProducts}).

Be Comprehensive: Extract all relevant pain points and solutions discussed in the transcript. The lists should be as exhaustive as possible.

Action-Oriented Pain Points: If a value is provided in the existingObjectives variable ({existingObjectives}), use those items as the basis for the painPoints array. Otherwise, create new pain points from the transcript. The items should be phrased as an action or an objective. Start each item with a verb (e.g., 'Address,' 'Eliminate,' 'Improve') to describe the desired outcome of overcoming the pain point.

Dynamic Solutions Object: The solutions object must be dynamically generated. The keys of this object must correspond exactly to the LeanData products listed in the selectedProducts variable ({selectedProducts}).

Product-Specific Solutions: For each product key in the solutions object, extract and list all specific actions, configurations, or benefits discussed. For example, under Account Matching, include details on how the customer wants to handle deduplication and merging of records. Under Integrations, include solutions related to third-party applications like Slack, Teams, and Zapier. Under BookIt, include discussions about form integration, automated scheduling, and the handoff module.

Fallback for Solutions: If no specific solution items for a particular product are mentioned in the transcript, the value for that product's key should be an array containing a single string: "Specific solutions for this product were not discussed in detail.". In this case, you must also set the isFallback key to true.

Professional Tone: The output should be suitable for a formal document, such as a Statement of Work (SOW).

Call Transcript:
{transcription}

CRITICAL: You must respond with ONLY valid JSON. Do not include any introductory or explanatory text, markdown formatting, or code blocks.`;

      // Apply variable substitution to fallback prompt
      finalPrompt = fallbackPrompt
        .replace(/\{customerName\}/g, customerName)
        .replace(/\{transcription\}/g, transcript)
        .replace(/\{selectedProducts\}/g, selectedProducts ? selectedProducts.join(', ') : 'None specified')
        .replace(/\{existingDescription\}/g, existingDescription || '')
        .replace(/\{existingObjectives\}/g, existingObjectives ? JSON.stringify(existingObjectives) : '[]');
    } else {
      // Use the prompt from the database, replacing placeholders
      console.log('=== USING DATABASE PROMPT ===');
      console.log('Original prompt from DB:', aiPrompt.prompt_content.substring(0, 200) + '...');
      console.log('Full prompt length:', aiPrompt.prompt_content.length);
      
      // Check for hardcoded values that might indicate the prompt template is wrong
      const hardcodedValues = {
        globalTech: aiPrompt.prompt_content.includes('GlobalTech'),
        globalTechSolutions: aiPrompt.prompt_content.includes('GlobalTech Solutions'),
        unit21: aiPrompt.prompt_content.includes('Unit 21'),
        customerNamePlaceholder: aiPrompt.prompt_content.includes('{customerName}'),
        transcriptionPlaceholder: aiPrompt.prompt_content.includes('{transcription}'),
        selectedProductsPlaceholder: aiPrompt.prompt_content.includes('{selectedProducts}')
      };
      console.log('Hardcoded values check:', hardcodedValues);
      
      // Show a sample of the prompt content to see what's actually there
      console.log('Sample prompt content (first 1000 chars):', aiPrompt.prompt_content.substring(0, 1000));
      
      // Check if the database prompt has the required placeholders
      const hasRequiredPlaceholders = aiPrompt.prompt_content.includes('{customerName}') && 
                                   aiPrompt.prompt_content.includes('{transcription}') && 
                                   aiPrompt.prompt_content.includes('{selectedProducts}');
      
      console.log('Has required placeholders:', hasRequiredPlaceholders);
      
      if (!hasRequiredPlaceholders) {
        console.warn('Database prompt is missing required placeholders, using fallback prompt instead');
        // Use fallback prompt logic
        const fallbackPrompt = `
LeanData Project Analysis Prompt

You are an expert business analyst and technical consultant specializing in LeanData solutions built upon Salesforce. Your task is to analyze a meeting transcript and extract key project details in a format suitable for a VP of Services.

Instructions

Analyze the provided meeting transcription and generate a valid, parseable JSON object that captures the project's core details.

The output must contain ONLY the JSON object. Do not include any introductory or explanatory text, markdown, or code blocks.

JSON Structure and Content Requirements

Your response must strictly adhere to the following JSON format.

{
  "objectiveOverview": "A comprehensive paragraph summarizing the customer's primary goals and the overall purpose of the project. The paragraph must explicitly mention the customer's name ({customerName}) and the LeanData products being implemented ({selectedProducts}).",
  "painPoints": [
    "An action-oriented pain point related to the project.",
    "Another action-oriented pain point.",
    "A third action-oriented pain point.",
    "A fourth action-oriented pain point."
  ],
  "solutions": {
    ${selectedProducts ? selectedProducts.map(product => `"${product}": ["Specific solution item related to ${product}, as discussed in the transcript."]`).join(',\n    ') : '// No products specified'}
  },
  "isFallback": false
}

Guidelines for Content Generation

Comprehensive Overview: If a value is provided in the existingDescription variable ({existingDescription}), use it as the starting point to generate a comprehensive paragraph for the objectiveOverview, otherwise, create a new summary based on the transcript. The overview should summarize the customer's primary goals and the overall purpose of the project and must explicitly mention the customer's name ({customerName}) and the LeanData products being implemented ({selectedProducts}).

Be Comprehensive: Extract all relevant pain points and solutions discussed in the transcript. The lists should be as exhaustive as possible.

Action-Oriented Pain Points: If a value is provided in the existingObjectives variable ({existingObjectives}), use those items as the basis for the painPoints array. Otherwise, create new pain points from the transcript. The items should be phrased as an action or an objective. Start each item with a verb (e.g., 'Address,' 'Eliminate,' 'Improve') to describe the desired outcome of overcoming the pain point.

Dynamic Solutions Object: The solutions object must be dynamically generated. The keys of this object must correspond exactly to the LeanData products listed in the selectedProducts variable ({selectedProducts}).

Product-Specific Solutions: For each product key in the solutions object, extract and list all specific actions, configurations, or benefits discussed. For example, under Account Matching, include details on how the customer wants to handle deduplication and merging of records. Under Integrations, include solutions related to third-party applications like Slack, Teams, and Zapier. Under BookIt, include discussions about form integration, automated scheduling, and the handoff module.

Fallback for Solutions: If no specific solution items for a particular product are mentioned in the transcript, the value for that product's key should be an array containing a single string: "Specific solutions for this product were not discussed in detail.". In this case, you must also set the isFallback key to true.

Professional Tone: The output should be suitable for a formal document, such as a Statement of Work (SOW).

Call Transcript:
{transcription}

CRITICAL: You must respond with ONLY valid JSON. Do not include any introductory or explanatory text, markdown formatting, or code blocks.`;

        // Apply variable substitution to fallback prompt
        finalPrompt = fallbackPrompt
          .replace(/\{customerName\}/g, customerName)
          .replace(/\{transcription\}/g, transcript)
          .replace(/\{selectedProducts\}/g, selectedProducts ? selectedProducts.join(', ') : 'None specified')
          .replace(/\{existingDescription\}/g, existingDescription || '')
          .replace(/\{existingObjectives\}/g, existingObjectives ? JSON.stringify(existingObjectives) : '[]');
      } else {
        // Use the prompt from the database, replacing placeholders
        finalPrompt = aiPrompt.prompt_content
          .replace(/\{customerName\}/g, customerName)
          .replace(/\{transcription\}/g, transcript)
          .replace(/\{selectedProducts\}/g, selectedProducts ? selectedProducts.join(', ') : '')
          .replace(/\{existingDescription\}/g, existingDescription || '')
          .replace(/\{existingObjectives\}/g, existingObjectives ? JSON.stringify(existingObjectives) : '[]');
      }
      
      console.log('=== AFTER VARIABLE SUBSTITUTION ===');
      console.log('Final prompt (first 500 chars):', finalPrompt.substring(0, 500));
    }

    // Debug logging to see what's being sent
    console.log('=== GEMINI PROMPT DEBUG ===');
    console.log('Original customerName:', customerName);
    console.log('Original selectedProducts:', selectedProducts);
    console.log('Prompt contains customerName?', finalPrompt.includes(customerName));
    console.log('Prompt contains selectedProducts?', selectedProducts ? selectedProducts.some(p => finalPrompt.includes(p)) : 'No products');
    console.log('Prompt length:', finalPrompt.length);
    console.log('=== END DEBUG ===');

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
    // No more complex parsing - just simple JSON handling

    const startTime = Date.now();
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

      // Simple JSON parsing - just get whatever the AI returns
      try {
        const parsed = JSON.parse(content);
        parsedResult = parsed;
        return parsed; // Return exactly what the AI gave us
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Content that failed to parse:', content);
        
        // If JSON parsing fails, return a simple error response
        return {
          error: 'Failed to parse AI response',
          rawContent: content
        };
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      console.error('Error analyzing transcription:', error);
      return {
        error: error.message,
        rawContent: geminiResponse
      };
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
          parsedResult,
          error,
          this.modelName,
          'API_KEY_PLACEHOLDER', // We'll need to get this from the config
          processingTime
        );
      } catch (loggingError) {
        console.error('Failed to log Gemini call:', loggingError);
      }
    }
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